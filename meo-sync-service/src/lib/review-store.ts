import { prisma } from "./db";

// クチコミへの返信操作のログ。実際の「現在の返信内容」はGoogle API(またはmock)側が
// 真実の情報源であり、ここは返信履歴の監査ログとして保持するのみ。
export async function logReviewReply(
  businessId: string,
  locationId: string,
  reviewId: string,
  replyText: string
): Promise<void> {
  await prisma.reviewReply.upsert({
    where: { businessId_reviewId: { businessId, reviewId } },
    create: { businessId, locationId, reviewId, replyText },
    update: { replyText, repliedAt: new Date() },
  });
}
