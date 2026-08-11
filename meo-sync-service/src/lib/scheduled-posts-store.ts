import { prisma } from "./db";
import { ScheduledPost } from "./types";

function toScheduledPost(row: {
  id: string;
  locationId: string;
  summary: string;
  mediaUrl: string;
  scheduledAt: Date;
  status: string;
  errorMessage: string | null;
  publishedAt: Date | null;
}): ScheduledPost {
  return {
    id: row.id,
    locationId: row.locationId,
    summary: row.summary,
    mediaUrl: row.mediaUrl,
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status as ScheduledPost["status"],
    errorMessage: row.errorMessage,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

export async function listScheduledPosts(businessId: string): Promise<ScheduledPost[]> {
  const rows = await prisma.scheduledPost.findMany({
    where: { businessId },
    orderBy: { scheduledAt: "asc" },
  });
  return rows.map(toScheduledPost);
}

export async function createScheduledPost(
  businessId: string,
  input: { locationId: string; summary: string; mediaUrl: string; scheduledAt: Date }
): Promise<ScheduledPost> {
  const row = await prisma.scheduledPost.create({
    data: { businessId, ...input },
  });
  return toScheduledPost(row);
}

export async function deleteScheduledPost(businessId: string, id: string): Promise<void> {
  await prisma.scheduledPost.deleteMany({ where: { id, businessId, status: "PENDING" } });
}

// businessIdを問わず、公開予定時刻を過ぎた未処理の予約投稿をすべて取得する(cron用)。
export async function listDuePosts(): Promise<
  (ScheduledPost & { businessId: string })[]
> {
  const rows = await prisma.scheduledPost.findMany({
    where: { status: "PENDING", scheduledAt: { lte: new Date() } },
  });
  return rows.map((row) => ({ ...toScheduledPost(row), businessId: row.businessId }));
}

export async function markPublished(id: string): Promise<void> {
  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

export async function markFailed(id: string, errorMessage: string): Promise<void> {
  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "FAILED", errorMessage },
  });
}
