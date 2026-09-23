import {
  getConnection,
  updateAccessToken,
  upsertConnection,
} from "./connections";
import {
  createPendingGoogleAdsConnection,
  deletePendingGoogleAdsConnection,
  getPendingGoogleAdsConnection,
  type GoogleAdsCustomerOption,
} from "./pending-google-ads-connection";

// Google Ads API を呼び出すクライアント。
// 参考: https://developers.google.com/google-ads/api/docs/start
//
// 注意:
// - 2026年9月9日付で開発者トークン(developer token)制度は廃止されました。
//   現在はAPIアクセスレベルが、OAuthクライアントID/シークレットを発行した
//   Google Cloudプロジェクトに直接紐づく方式になっています。MCC(クライアント
//   センター)アカウントも不要です。申請は Google Cloud Console の
//   https://console.cloud.google.com/google/ads-apis/overview から行います
//   (https://developers.google.com/google-ads/api/docs/api-policy/developer-token)。
//   developer-tokenヘッダーは送っても送らなくてもAPIサーバー側で無視されるため、
//   GOOGLE_ADS_DEVELOPER_TOKEN は任意設定として扱う。
// - APIバージョンは頻繁に更新されるため、実装時点の最新版を
//   公式ドキュメントで必ず確認してください(下記は実装時点のバージョン)。

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADS_API_BASE = "https://googleads.googleapis.com/v18";
export const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

export function buildGoogleAdsAuthorizeUrl(state: string): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", requireEnv("GOOGLE_ADS_REDIRECT_URI"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_ADS_SCOPE);
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
    redirect_uri: requireEnv("GOOGLE_ADS_REDIRECT_URI"),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Google Adsトークン取得に失敗しました: ${await res.text()}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

function adsHeaders(accessToken: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  // 開発者トークンは廃止済みでAPIサーバー側に無視されるが、設定されていれば
  // 後方互換のため送っておく(未設定でもエラーにはしない)。
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (developerToken) headers["developer-token"] = developerToken;
  return headers;
}

async function fetchDescriptiveName(
  accessToken: string,
  customerId: string
): Promise<string> {
  try {
    const res = await fetch(`${ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: adsHeaders(accessToken),
      body: JSON.stringify({
        query: "SELECT customer.descriptive_name FROM customer LIMIT 1",
      }),
    });
    if (!res.ok) return customerId;
    const data = await res.json();
    return data.results?.[0]?.customer?.descriptiveName ?? customerId;
  } catch {
    return customerId;
  }
}

export type CompleteGoogleAdsOAuthResult =
  | { status: "connected" }
  | { status: "needs_selection"; pendingId: string; customers: GoogleAdsCustomerOption[] };

export async function completeGoogleAdsOAuth(
  businessId: string,
  code: string
): Promise<CompleteGoogleAdsOAuthResult> {
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "refresh_tokenが取得できませんでした。Google Ads連携を一度解除し、再度連携してください(prompt=consentが必要です)"
    );
  }

  const listRes = await fetch(`${ADS_API_BASE}/customers:listAccessibleCustomers`, {
    headers: adsHeaders(tokens.access_token),
  });
  if (!listRes.ok) {
    throw new Error(`Google Ads顧客アカウント取得に失敗しました: ${await listRes.text()}`);
  }
  const listData = await listRes.json();
  const resourceNames = (listData.resourceNames ?? []) as string[];

  if (resourceNames.length === 0) {
    throw new Error(
      "アクセス可能なGoogle Ads顧客アカウントが見つかりませんでした。このGoogleアカウントに広告アカウントへのアクセス権があるか確認してください"
    );
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const customers: GoogleAdsCustomerOption[] = await Promise.all(
    resourceNames.map(async (resourceName) => {
      const customerId = resourceName.split("/")[1] ?? resourceName;
      const descriptiveName = await fetchDescriptiveName(tokens.access_token, customerId);
      return { resourceName, descriptiveName };
    })
  );

  if (customers.length === 1) {
    await upsertConnection({
      businessId,
      provider: "google_ads",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      externalAccountId: customers[0].resourceName,
      externalLabel: customers[0].descriptiveName,
    });
    return { status: "connected" };
  }

  const pending = await createPendingGoogleAdsConnection({
    businessId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    customers,
  });

  return { status: "needs_selection", pendingId: pending.id, customers };
}

export async function finalizeGoogleAdsCustomerSelection(
  pendingId: string,
  customerResourceName: string
): Promise<void> {
  const pending = await getPendingGoogleAdsConnection(pendingId);
  if (!pending) {
    throw new Error("選択の有効期限が切れました。もう一度連携をやり直してください");
  }

  const chosen = pending.customers.find((c) => c.resourceName === customerResourceName);
  if (!chosen) {
    throw new Error("不正な広告アカウントが選択されました");
  }

  await upsertConnection({
    businessId: pending.businessId,
    provider: "google_ads",
    accessToken: pending.accessToken,
    refreshToken: pending.refreshToken,
    expiresAt: pending.expiresAt,
    externalAccountId: chosen.resourceName,
    externalLabel: chosen.descriptiveName,
  });

  await deletePendingGoogleAdsConnection(pendingId);
}

async function getValidGoogleAdsAccessToken(
  businessId: string
): Promise<{ accessToken: string; customerId: string }> {
  const connection = await getConnection(businessId, "google_ads");
  if (!connection) throw new Error("Google Adsが接続されていません");

  const customerId = connection.externalAccountId.split("/")[1] ?? connection.externalAccountId;

  const expired =
    connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60_000;

  if (!expired) {
    return { accessToken: connection.accessToken, customerId };
  }

  if (!connection.refreshToken) {
    throw new Error(
      "Google Adsアクセストークンの有効期限が切れ、refresh_tokenもありません。再連携してください"
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
    throw new Error(`Google Adsトークン更新に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  await updateAccessToken(businessId, "google_ads", data.access_token, newExpiresAt);

  return { accessToken: data.access_token, customerId };
}

export type GoogleAdsKeyword = {
  keyword: string;
  matchType: string | null;
  status: string | null;
};

// 有効なキャンペーン・広告グループに設定されている検索キーワードを取得する。
// (実際に検索されて表示された語句そのものではなく、広告主が入札対象として
//  設定しているキーワード。README参照。)
export async function fetchRealAdKeywords(businessId: string): Promise<{
  customerId: string;
  keywords: GoogleAdsKeyword[];
}> {
  const { accessToken, customerId } = await getValidGoogleAdsAccessToken(businessId);

  const query = `
    SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status
    FROM keyword_view
    WHERE campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND ad_group_criterion.status = 'ENABLED'
    LIMIT 200
  `;

  const res = await fetch(`${ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: adsHeaders(accessToken),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Google Ads検索キーワード取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();

  type Row = {
    adGroupCriterion?: {
      keyword?: { text?: string; matchType?: string };
      status?: string;
    };
  };
  const keywords = ((data.results ?? []) as Row[])
    .map((row) => ({
      keyword: row.adGroupCriterion?.keyword?.text ?? "",
      matchType: row.adGroupCriterion?.keyword?.matchType ?? null,
      status: row.adGroupCriterion?.status ?? null,
    }))
    .filter((k) => k.keyword);

  return { customerId, keywords };
}
