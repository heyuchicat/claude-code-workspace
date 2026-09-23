import { prisma } from "./db";

// Google Ads OAuth完了直後、アクセス可能な広告アカウント(顧客)が複数ある場合に
// 選択が完了するまでトークンを一時保管する。10分で無効。

const TTL_MS = 1000 * 60 * 10;

export type GoogleAdsCustomerOption = { resourceName: string; descriptiveName: string };

export type PendingGoogleAdsConnection = {
  id: string;
  businessId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  customers: GoogleAdsCustomerOption[];
};

export async function createPendingGoogleAdsConnection(input: {
  businessId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  customers: GoogleAdsCustomerOption[];
}): Promise<PendingGoogleAdsConnection> {
  const row = await prisma.pendingGoogleAdsConnection.create({
    data: {
      businessId: input.businessId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      customersJson: JSON.stringify(input.customers),
    },
  });
  return {
    id: row.id,
    businessId: row.businessId,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: row.expiresAt,
    customers: JSON.parse(row.customersJson),
  };
}

export async function getPendingGoogleAdsConnection(
  id: string
): Promise<PendingGoogleAdsConnection | null> {
  const row = await prisma.pendingGoogleAdsConnection.findUnique({ where: { id } });
  if (!row) return null;
  if (Date.now() - row.createdAt.getTime() > TTL_MS) {
    await prisma.pendingGoogleAdsConnection.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  return {
    id: row.id,
    businessId: row.businessId,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: row.expiresAt,
    customers: JSON.parse(row.customersJson),
  };
}

export async function deletePendingGoogleAdsConnection(id: string): Promise<void> {
  await prisma.pendingGoogleAdsConnection.delete({ where: { id } }).catch(() => undefined);
}
