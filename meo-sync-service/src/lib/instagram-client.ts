import { InstagramAccount, InstagramPost } from "./types";
import {
  getConnection,
  updateAccessToken,
  upsertConnection,
} from "./connections";

// 実際の Instagram API (Instagram API with Instagram Login) を呼び出すクライアント。
// 参考: https://developers.facebook.com/docs/instagram-platform/
//
// 注意: Meta のAPI仕様は変更されることがあります。アプリ登録時に最新のドキュメントで
// エンドポイント・スコープ名を必ず確認してください。

const IG_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const IG_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const IG_GRAPH_BASE = "https://graph.instagram.com";
const IG_SCOPES = "instagram_business_basic";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

export function buildInstagramAuthorizeUrl(state: string): string {
  const clientId = requireEnv("INSTAGRAM_APP_ID");
  const redirectUri = requireEnv("INSTAGRAM_REDIRECT_URI");
  const url = new URL(IG_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", IG_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeCodeForShortLivedToken(code: string): Promise<{
  accessToken: string;
  userId: string;
}> {
  const form = new URLSearchParams({
    client_id: requireEnv("INSTAGRAM_APP_ID"),
    client_secret: requireEnv("INSTAGRAM_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: requireEnv("INSTAGRAM_REDIRECT_URI"),
    code,
  });

  const res = await fetch(IG_TOKEN_URL, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Instagramトークン取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token, userId: String(data.user_id) };
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresInSeconds: number;
}> {
  const url = new URL(`${IG_GRAPH_BASE}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", requireEnv("INSTAGRAM_APP_SECRET"));
  url.searchParams.set("access_token", shortLivedToken);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Instagram長期トークン取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}

// OAuthコールバックで呼び出す: 認可コード -> 長期アクセストークンを取得しDBへ保存する。
export async function completeInstagramOAuth(code: string): Promise<void> {
  const { accessToken: shortLived, userId } =
    await exchangeCodeForShortLivedToken(code);
  const { accessToken, expiresInSeconds } =
    await exchangeForLongLivedToken(shortLived);

  const profile = await fetchProfileWithToken(accessToken);

  await upsertConnection({
    provider: "instagram",
    accessToken,
    refreshToken: null,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    externalAccountId: userId,
    externalLabel: `@${profile.username}`,
  });
}

async function refreshLongLivedTokenIfNeeded(): Promise<string> {
  const connection = await getConnection("instagram");
  if (!connection) throw new Error("Instagramが接続されていません");

  const willExpireSoon =
    connection.expiresAt && connection.expiresAt.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 3; // 3日前

  if (!willExpireSoon) return connection.accessToken;

  const url = new URL(`${IG_GRAPH_BASE}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", connection.accessToken);

  const res = await fetch(url);
  if (!res.ok) {
    // リフレッシュに失敗しても既存トークンで継続を試みる
    return connection.accessToken;
  }
  const data = await res.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  await updateAccessToken("instagram", data.access_token, newExpiresAt);
  return data.access_token;
}

async function fetchProfileWithToken(
  accessToken: string
): Promise<{ id: string; username: string }> {
  const url = new URL(`${IG_GRAPH_BASE}/me`);
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Instagramプロフィール取得に失敗しました: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchRealInstagramAccount(): Promise<InstagramAccount> {
  const accessToken = await refreshLongLivedTokenIfNeeded();
  const profile = await fetchProfileWithToken(accessToken);
  return {
    id: profile.id,
    username: profile.username,
    profilePictureUrl: "",
  };
}

const MEDIA_FIELDS =
  "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count";

type InstagramMediaResponse = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

function toInstagramPost(media: InstagramMediaResponse): InstagramPost {
  return {
    id: media.id,
    caption: media.caption ?? "",
    mediaType: media.media_type,
    mediaUrl: media.media_url,
    permalink: media.permalink,
    timestamp: media.timestamp,
    likeCount: media.like_count ?? 0,
    commentCount: media.comments_count ?? 0,
  };
}

export async function fetchRealInstagramPosts(): Promise<InstagramPost[]> {
  const accessToken = await refreshLongLivedTokenIfNeeded();
  const url = new URL(`${IG_GRAPH_BASE}/me/media`);
  url.searchParams.set("fields", MEDIA_FIELDS);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Instagram投稿取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.data as InstagramMediaResponse[]).map(toInstagramPost);
}

export async function fetchRealInstagramPostById(
  id: string
): Promise<InstagramPost | undefined> {
  const accessToken = await refreshLongLivedTokenIfNeeded();
  const url = new URL(`${IG_GRAPH_BASE}/${id}`);
  url.searchParams.set("fields", MEDIA_FIELDS);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  if (!res.ok) return undefined;
  return toInstagramPost(await res.json());
}
