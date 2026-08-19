import { prisma } from "./db";

export type Business = {
  id: string;
  name: string;
  createdAt: string;
  reportEmail: string | null;
  alertEmail: string | null;
  slackWebhookUrl: string | null;
  prefecture: string | null;
};

function toBusiness(row: {
  id: string;
  name: string;
  createdAt: Date;
  reportEmail: string | null;
  alertEmail: string | null;
  slackWebhookUrl: string | null;
  prefecture: string | null;
}): Business {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    reportEmail: row.reportEmail,
    alertEmail: row.alertEmail,
    slackWebhookUrl: row.slackWebhookUrl,
    prefecture: row.prefecture,
  };
}

export async function listBusinesses(): Promise<Business[]> {
  const rows = await prisma.business.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toBusiness);
}

export async function getBusiness(id: string): Promise<Business | null> {
  const row = await prisma.business.findUnique({ where: { id } });
  if (!row) return null;
  return toBusiness(row);
}

export async function createBusiness(name: string): Promise<Business> {
  const row = await prisma.business.create({ data: { name } });
  return toBusiness(row);
}

export async function deleteBusiness(id: string): Promise<void> {
  await prisma.business.delete({ where: { id } });
}

export async function updateBusinessSettings(
  id: string,
  input: Partial<Pick<Business, "reportEmail" | "alertEmail" | "slackWebhookUrl" | "prefecture">>
): Promise<Business> {
  const row = await prisma.business.update({ where: { id }, data: input });
  return toBusiness(row);
}

// 初回アクセス時に店舗が1件も無ければ、迷わないようデフォルト店舗を1件作る。
export async function ensureAtLeastOneBusiness(): Promise<Business> {
  const businesses = await listBusinesses();
  if (businesses.length > 0) return businesses[0];
  return createBusiness("店舗1");
}
