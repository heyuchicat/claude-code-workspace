import { prisma } from "./db";

export type TrackedKeywordRecord = {
  id: string;
  businessId: string;
  locationId: string;
  keyword: string;
  businessNameMatch: string;
  createdAt: string;
};

function toRecord(row: {
  id: string;
  businessId: string;
  locationId: string;
  keyword: string;
  businessNameMatch: string;
  createdAt: Date;
}): TrackedKeywordRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    locationId: row.locationId,
    keyword: row.keyword,
    businessNameMatch: row.businessNameMatch,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTrackedKeywords(businessId: string): Promise<TrackedKeywordRecord[]> {
  const rows = await prisma.trackedKeyword.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

export async function addTrackedKeyword(
  businessId: string,
  locationId: string,
  keyword: string,
  businessNameMatch: string
): Promise<TrackedKeywordRecord> {
  const row = await prisma.trackedKeyword.create({
    data: { businessId, locationId, keyword, businessNameMatch },
  });
  return toRecord(row);
}

export async function removeTrackedKeyword(businessId: string, id: string): Promise<void> {
  await prisma.trackedKeyword.deleteMany({ where: { id, businessId } });
}

export async function listAllTrackedKeywords(): Promise<TrackedKeywordRecord[]> {
  const rows = await prisma.trackedKeyword.findMany();
  return rows.map(toRecord);
}
