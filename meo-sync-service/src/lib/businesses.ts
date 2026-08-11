import { prisma } from "./db";

export type Business = {
  id: string;
  name: string;
  createdAt: string;
};

export async function listBusinesses(): Promise<Business[]> {
  const rows = await prisma.business.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.createdAt.toISOString() }));
}

export async function getBusiness(id: string): Promise<Business | null> {
  const row = await prisma.business.findUnique({ where: { id } });
  if (!row) return null;
  return { id: row.id, name: row.name, createdAt: row.createdAt.toISOString() };
}

export async function createBusiness(name: string): Promise<Business> {
  const row = await prisma.business.create({ data: { name } });
  return { id: row.id, name: row.name, createdAt: row.createdAt.toISOString() };
}

export async function deleteBusiness(id: string): Promise<void> {
  await prisma.business.delete({ where: { id } });
}

// 初回アクセス時に店舗が1件も無ければ、迷わないようデフォルト店舗を1件作る。
export async function ensureAtLeastOneBusiness(): Promise<Business> {
  const businesses = await listBusinesses();
  if (businesses.length > 0) return businesses[0];
  return createBusiness("店舗1");
}
