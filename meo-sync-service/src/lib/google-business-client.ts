import { GoogleBusinessLocation, GoogleBusinessPost } from "./types";
import {
  getConnection,
  updateAccessToken,
  upsertConnection,
} from "./connections";
import {
  createPendingGoogleConnection,
  deletePendingGoogleConnection,
  getPendingGoogleConnection,
  type GoogleAccountOption,
} from "./pending-google-connection";
import type { CreateGoogleBusinessPostInput } from "./mock-google-business";

// 実際の Google Business Profile API を呼び出すクライアント。
// 参考: https://developers.google.com/my-business/content/overview
//
// 注意: このAPI群はGoogleの利用申請(アクセスリクエスト)が承認されるまで
// 呼び出しても権限エラーになります。また localPosts (投稿) 関連のエンドポイントは
// 過去に複数回リニューアルされているため、実装時点の公式ドキュメントで
// 必ずエンドポイントを再確認してください。

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNT_MGMT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_MYBUSINESS_BASE = "https://mybusiness.googleapis.com/v4";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/business.manage";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

export function buildGoogleAuthorizeUrl(state: string): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", requireEnv("GOOGLE_REDIRECT_URI"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeCodeForTokens(code: string) {
  const form = new URLSearchParams({
    code,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Googleトークン取得に失敗しました: ${await res.text()}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

export type CompleteGoogleOAuthResult =
  | { status: "connected" }
  | { status: "needs_selection"; pendingId: string; accounts: GoogleAccountOption[] };

// OAuth完了後、そのGoogleアカウントがManager権限を持つビジネスアカウントが
// 複数ある場合(代理店が複数の顧客からアクセス権をもらっているケース)は、
// どの顧客をこの店舗に紐づけるか選んでもらう必要があるため即座には確定しない。
export async function completeGoogleOAuth(
  businessId: string,
  code: string
): Promise<CompleteGoogleOAuthResult> {
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "refresh_tokenが取得できませんでした。Googleアカウントの連携を一度解除し、再度連携してください(prompt=consentが必要です)"
    );
  }

  const accountRes = await fetch(`${ACCOUNT_MGMT_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!accountRes.ok) {
    throw new Error(`Googleアカウント取得に失敗しました: ${await accountRes.text()}`);
  }
  const accountData = await accountRes.json();
  const accounts = (accountData.accounts ?? []) as {
    name: string;
    accountName?: string;
  }[];

  if (accounts.length === 0) {
    throw new Error(
      "アクセス可能なGoogleビジネスアカウントが見つかりませんでした。顧客側でこのGoogleアカウントを「ユーザー(管理者)」として招待済みか確認してください"
    );
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  if (accounts.length === 1) {
    await upsertConnection({
      businessId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      externalAccountId: accounts[0].name, // 例: "accounts/123456789"
      externalLabel: accounts[0].accountName ?? accounts[0].name,
    });
    return { status: "connected" };
  }

  const options: GoogleAccountOption[] = accounts.map((a) => ({
    name: a.name,
    accountName: a.accountName ?? a.name,
  }));

  const pending = await createPendingGoogleConnection({
    businessId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    accounts: options,
  });

  return { status: "needs_selection", pendingId: pending.id, accounts: options };
}

// アクセス可能なアカウントが複数あった場合に、選択されたアカウントで接続を確定する。
export async function finalizeGoogleAccountSelection(
  pendingId: string,
  accountResourceName: string
): Promise<void> {
  const pending = await getPendingGoogleConnection(pendingId);
  if (!pending) {
    throw new Error("選択の有効期限が切れました。もう一度連携をやり直してください");
  }

  const chosen = pending.accounts.find((a) => a.name === accountResourceName);
  if (!chosen) {
    throw new Error("不正なアカウントが選択されました");
  }

  await upsertConnection({
    businessId: pending.businessId,
    provider: "google",
    accessToken: pending.accessToken,
    refreshToken: pending.refreshToken,
    expiresAt: pending.expiresAt,
    externalAccountId: chosen.name,
    externalLabel: chosen.accountName,
  });

  await deletePendingGoogleConnection(pendingId);
}

// レビュー・インサイト等、他のGoogle API呼び出しからも使う共通のトークン取得。
export async function getValidGoogleAccessToken(businessId: string): Promise<{
  accessToken: string;
  accountResourceName: string;
}> {
  const connection = await getConnection(businessId, "google");
  if (!connection) throw new Error("Googleが接続されていません");

  const expired =
    connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60_000;

  if (!expired) {
    return {
      accessToken: connection.accessToken,
      accountResourceName: connection.externalAccountId,
    };
  }

  if (!connection.refreshToken) {
    throw new Error(
      "Googleアクセストークンの有効期限が切れ、refresh_tokenもありません。再連携してください"
    );
  }

  const form = new URLSearchParams({
    refresh_token: connection.refreshToken,
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Googleトークン更新に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  await updateAccessToken(businessId, "google", data.access_token, newExpiresAt);

  return {
    accessToken: data.access_token,
    accountResourceName: connection.externalAccountId,
  };
}

export async function fetchRealGoogleBusinessLocations(
  businessId: string
): Promise<GoogleBusinessLocation[]> {
  const { accessToken, accountResourceName } =
    await getValidGoogleAccessToken(businessId);

  const url = new URL(`${BUSINESS_INFO_BASE}/${accountResourceName}/locations`);
  url.searchParams.set("readMask", "name,title,storefrontAddress,metadata");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Googleロケーション取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();

  type ApiLocation = {
    name: string; // "locations/12345"
    title?: string;
    storefrontAddress?: { addressLines?: string[]; locality?: string };
    metadata?: { mapsUri?: string };
  };

  return ((data.locations ?? []) as ApiLocation[]).map((loc) => ({
    id: loc.name,
    name: loc.title ?? loc.name,
    address: [
      ...(loc.storefrontAddress?.addressLines ?? []),
      loc.storefrontAddress?.locality,
    ]
      .filter(Boolean)
      .join(" "),
    mapsUrl: loc.metadata?.mapsUri ?? "",
  }));
}

function toGoogleBusinessPost(
  raw: { name: string; summary?: string; createTime?: string; state?: string; media?: { googleUrl?: string }[] },
  locationId: string,
  sourceInstagramPostId: string
): GoogleBusinessPost {
  return {
    id: raw.name,
    locationId,
    summary: raw.summary ?? "",
    mediaUrl: raw.media?.[0]?.googleUrl ?? "",
    createdAt: raw.createTime ?? new Date().toISOString(),
    status: raw.state === "REJECTED" ? "REJECTED" : raw.state === "LIVE" ? "LIVE" : "PENDING",
    sourceInstagramPostId,
  };
}

// locationId は fetchRealGoogleBusinessLocations() が返す "locations/xxx" 形式を想定。
export async function createRealGoogleBusinessPost(
  businessId: string,
  input: CreateGoogleBusinessPostInput
): Promise<GoogleBusinessPost> {
  const { accessToken, accountResourceName } =
    await getValidGoogleAccessToken(businessId);

  const parent = `${accountResourceName}/${input.locationId}`;
  const res = await fetch(`${LEGACY_MYBUSINESS_BASE}/${parent}/localPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      languageCode: "ja",
      summary: input.summary,
      media: [{ mediaFormat: "PHOTO", sourceUrl: input.mediaUrl }],
      topicType: "STANDARD",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google投稿の作成に失敗しました: ${await res.text()}`);
  }

  const data = await res.json();
  return toGoogleBusinessPost(data, input.locationId, input.sourceInstagramPostId);
}

export async function fetchRealGoogleBusinessPosts(
  businessId: string,
  locationId: string,
  sourceInstagramPostIdByPostName: Map<string, string>
): Promise<GoogleBusinessPost[]> {
  const { accessToken, accountResourceName } =
    await getValidGoogleAccessToken(businessId);
  const parent = `${accountResourceName}/${locationId}`;

  const res = await fetch(`${LEGACY_MYBUSINESS_BASE}/${parent}/localPosts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google投稿一覧の取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return ((data.localPosts ?? []) as { name: string; summary?: string; createTime?: string; state?: string; media?: { googleUrl?: string }[] }[]).map(
    (raw) =>
      toGoogleBusinessPost(
        raw,
        locationId,
        sourceInstagramPostIdByPostName.get(raw.name) ?? ""
      )
  );
}
