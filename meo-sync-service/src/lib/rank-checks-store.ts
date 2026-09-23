import { prisma } from "./db";
import { RankCheckResult } from "./types";

function toResult(row: {
  id: string;
  locationId: string;
  keyword: string;
  rank: number | null;
  checkedAt: Date;
}): RankCheckResult {
  return {
    id: row.id,
    locationId: row.locationId,
    keyword: row.keyword,
    rank: row.rank,
    checkedAt: row.checkedAt.toISOString(),
  };
}

export async function listRankChecks(
  businessId: string,
  locationId: string
): Promise<RankCheckResult[]> {
  const rows = await prisma.rankCheck.findMany({
    where: { businessId, locationId },
    orderBy: { checkedAt: "desc" },
    take: 50,
  });
  return rows.map(toResult);
}

export async function recordRankCheck(
  businessId: string,
  locationId: string,
  keyword: string,
  rank: number | null
): Promise<RankCheckResult> {
  const row = await prisma.rankCheck.create({
    data: { businessId, locationId, keyword, rank },
  });
  return toResult(row);
}
