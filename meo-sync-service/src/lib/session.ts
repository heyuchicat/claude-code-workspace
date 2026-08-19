// 管理者ログイン用の署名付きセッショントークン(HMAC-SHA256)。
// ライブラリなしで軽量に実装するための自前実装。DB(AdminSettings)に保存された
// sessionSecretで署名する(.envの手編集を不要にするため)。

import { getAdminSettings } from "./admin-settings";

const SESSION_COOKIE_NAME = "meo_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7日

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString("base64url");
}

export async function createSessionToken(): Promise<string> {
  const settings = await getAdminSettings();
  if (!settings) {
    throw new Error("初回セットアップが完了していません");
  }
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `authenticated.${expiresAt}`;
  const signature = await hmac(payload, settings.sessionSecret);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [marker, expiresAtStr, signature] = parts;
  if (marker !== "authenticated") return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const settings = await getAdminSettings();
  if (!settings) return false;

  const expectedSignature = await hmac(`${marker}.${expiresAtStr}`, settings.sessionSecret);
  return signature === expectedSignature;
}

export { SESSION_COOKIE_NAME };
