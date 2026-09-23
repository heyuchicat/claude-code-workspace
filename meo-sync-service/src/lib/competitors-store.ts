import { prisma } from "./db";

export type CompetitorRecord = {
  id: string;
  businessId: string;
  placeId: string;
  label: string;
  createdAt: string;
};

function toRecord(row: {
  id: string;
  businessId: string;
  placeId: string;
  label: string;
  createdAt: Date;
}): CompetitorRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    placeId: row.placeId,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCompetitors(businessId: string): Promise<CompetitorRecord[]> {
  const rows = await prisma.competitor.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRecord);
}

export async function addCompetitor(
  businessId: string,
  placeId: string,
  label: string
): Promise<CompetitorRecord> {
  const row = await prisma.competitor.create({ data: { businessId, placeId, label } });
  return toRecord(row);
}

export async function removeCompetitor(businessId: string, id: string): Promise<void> {
  await prisma.competitor.deleteMany({ where: { id, businessId } });
}
