import { prisma } from "./db";

export type ExternalListingRecord = {
  id: string;
  businessId: string;
  platform: string;
  url: string;
  createdAt: string;
};

function toRecord(row: {
  id: string;
  businessId: string;
  platform: string;
  url: string;
  createdAt: Date;
}): ExternalListingRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    platform: row.platform,
    url: row.url,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listExternalListings(businessId: string): Promise<ExternalListingRecord[]> {
  const rows = await prisma.externalListing.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

export async function addExternalListing(
  businessId: string,
  platform: string,
  url: string
): Promise<ExternalListingRecord> {
  const row = await prisma.externalListing.create({ data: { businessId, platform, url } });
  return toRecord(row);
}

export async function removeExternalListing(businessId: string, id: string): Promise<void> {
  await prisma.externalListing.deleteMany({ where: { id, businessId } });
}
