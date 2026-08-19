import { prisma } from "./db";

// Google OAuth完了直後、アクセス可能なビジネスアカウント(顧客)が複数ある場合に
// 選択が完了するまでトークンを一時保管する。10分で無効。

const TTL_MS = 1000 * 60 * 10;

export type GoogleAccountOption = { name: string; accountName: string };

export type PendingGoogleConnection = {
  id: string;
  businessId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  accounts: GoogleAccountOption[];
};

export async function createPendingGoogleConnection(input: {
  businessId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  accounts: GoogleAccountOption[];
}): Promise<PendingGoogleConnection> {
  const row = await prisma.pendingGoogleConnection.create({
    data: {
      businessId: input.businessId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      accountsJson: JSON.stringify(input.accounts),
    },
  });
  return {
    id: row.id,
    businessId: row.businessId,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: row.expiresAt,
    accounts: JSON.parse(row.accountsJson),
  };
}

export async function getPendingGoogleConnection(
  id: string
): Promise<PendingGoogleConnection | null> {
  const row = await prisma.pendingGoogleConnection.findUnique({ where: { id } });
  if (!row) return null;
  if (Date.now() - row.createdAt.getTime() > TTL_MS) {
    await prisma.pendingGoogleConnection.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  return {
    id: row.id,
    businessId: row.businessId,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: row.expiresAt,
    accounts: JSON.parse(row.accountsJson),
  };
}

export async function deletePendingGoogleConnection(id: string): Promise<void> {
  await prisma.pendingGoogleConnection.delete({ where: { id } }).catch(() => undefined);
}
