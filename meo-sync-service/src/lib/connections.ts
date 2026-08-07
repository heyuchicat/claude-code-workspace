import { prisma } from "./db";

export type Provider = "instagram" | "google";

export type ConnectionRecord = {
  provider: Provider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  externalAccountId: string;
  externalLabel: string;
};

export async function getConnection(
  provider: Provider
): Promise<ConnectionRecord | null> {
  const row = await prisma.connection.findUnique({ where: { provider } });
  if (!row) return null;
  return {
    provider: row.provider as Provider,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: row.expiresAt,
    externalAccountId: row.externalAccountId,
    externalLabel: row.externalLabel,
  };
}

export async function upsertConnection(record: ConnectionRecord): Promise<void> {
  await prisma.connection.upsert({
    where: { provider: record.provider },
    create: {
      provider: record.provider,
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      expiresAt: record.expiresAt,
      externalAccountId: record.externalAccountId,
      externalLabel: record.externalLabel,
    },
    update: {
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      expiresAt: record.expiresAt,
      externalAccountId: record.externalAccountId,
      externalLabel: record.externalLabel,
    },
  });
}

export async function updateAccessToken(
  provider: Provider,
  accessToken: string,
  expiresAt: Date | null
): Promise<void> {
  await prisma.connection.update({
    where: { provider },
    data: { accessToken, expiresAt },
  });
}

export async function deleteConnection(provider: Provider): Promise<void> {
  await prisma.connection.deleteMany({ where: { provider } });
}
