import { prisma } from "./db";

export type AdKeywordRecord = {
  id: string;
  businessId: string;
  customerId: string;
  keyword: string;
  matchType: string | null;
  status: string | null;
  fetchedAt: string;
};

function toRecord(row: {
  id: string;
  businessId: string;
  customerId: string;
  keyword: string;
  matchType: string | null;
  status: string | null;
  fetchedAt: Date;
}): AdKeywordRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    customerId: row.customerId,
    keyword: row.keyword,
    matchType: row.matchType,
    status: row.status,
    fetchedAt: row.fetchedAt.toISOString(),
  };
}

export async function listAdKeywords(businessId: string): Promise<AdKeywordRecord[]> {
  const rows = await prisma.adKeyword.findMany({
    where: { businessId },
    orderBy: { keyword: "asc" },
  });
  return rows.map(toRecord);
}

// Google Adsから取得したキーワード一覧で置き換える(取得のたびに最新化する)。
export async function replaceAdKeywords(
  businessId: string,
  customerId: string,
  keywords: { keyword: string; matchType: string | null; status: string | null }[]
): Promise<AdKeywordRecord[]> {
  await prisma.$transaction([
    prisma.adKeyword.deleteMany({ where: { businessId, customerId } }),
    prisma.adKeyword.createMany({
      data: keywords.map((k) => ({
        businessId,
        customerId,
        keyword: k.keyword,
        matchType: k.matchType,
        status: k.status,
      })),
    }),
  ]);
  return listAdKeywords(businessId);
}
