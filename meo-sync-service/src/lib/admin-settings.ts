import crypto from "node:crypto";
import { prisma } from "./db";

// アプリ全体の管理者設定(パスワード・各種秘密鍵)をDBで管理する。
// .envの手編集が不要になるよう、初回アクセス時のセットアップ画面から作成される。

const SETTINGS_ID = "singleton";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function isSetUp(): Promise<boolean> {
  const row = await prisma.adminSettings.findUnique({ where: { id: SETTINGS_ID } });
  return row !== null;
}

export async function getAdminSettings() {
  return prisma.adminSettings.findUnique({ where: { id: SETTINGS_ID } });
}

export async function createAdminSettings(password: string) {
  const existing = await prisma.adminSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) {
    throw new Error("すでにセットアップ済みです");
  }
  return prisma.adminSettings.create({
    data: {
      id: SETTINGS_ID,
      passwordHash: hashPassword(password),
      sessionSecret: crypto.randomBytes(32).toString("hex"),
      cronSecret: crypto.randomBytes(24).toString("hex"),
    },
  });
}

export async function verifyPassword(password: string): Promise<boolean> {
  const settings = await getAdminSettings();
  if (!settings) return false;
  return verifyPasswordHash(password, settings.passwordHash);
}

export async function regenerateCronSecret(): Promise<string> {
  const cronSecret = crypto.randomBytes(24).toString("hex");
  await prisma.adminSettings.update({
    where: { id: SETTINGS_ID },
    data: { cronSecret },
  });
  return cronSecret;
}

export async function changePassword(newPassword: string): Promise<void> {
  await prisma.adminSettings.update({
    where: { id: SETTINGS_ID },
    data: { passwordHash: hashPassword(newPassword) },
  });
}
