import { prisma } from "./db";
import { fetchGoogleBusinessLocations, fetchReviews } from "./data-source";
import { notifyBusiness } from "./notify";

const LOW_RATING_THRESHOLD = 2; // これ以下の評価で通知
const RANK_DROP_THRESHOLD = 3; // 順位がこれ以上悪化したら通知

export type AlertCheckResult = {
  businessId: string;
  lowRatingAlerts: number;
  rankDropAlerts: number;
  error?: string;
};

async function checkLowRatingReviews(
  business: { id: string; name: string; alertEmail: string | null; slackWebhookUrl: string | null }
): Promise<number> {
  if (!business.alertEmail && !business.slackWebhookUrl) return 0;

  const locations = await fetchGoogleBusinessLocations(business.id);
  let alertCount = 0;

  for (const location of locations) {
    const reviews = await fetchReviews(business.id, location.id);
    const lowRatingReviews = reviews.filter((r) => r.rating <= LOW_RATING_THRESHOLD);

    for (const review of lowRatingReviews) {
      const already = await prisma.alertedReview.findUnique({
        where: { businessId_reviewId: { businessId: business.id, reviewId: review.id } },
      });
      if (already) continue;

      await notifyBusiness(
        business,
        `【低評価クチコミ】${business.name} / ${location.name}`,
        `評価${review.rating}のクチコミが投稿されました。\n\n投稿者: ${review.reviewerName}\n内容: ${review.comment}\n\nダッシュボードから返信をご検討ください。`
      );

      await prisma.alertedReview.create({
        data: { businessId: business.id, reviewId: review.id },
      });
      alertCount++;
    }
  }

  return alertCount;
}

async function checkRankDrops(
  business: { id: string; name: string; alertEmail: string | null; slackWebhookUrl: string | null }
): Promise<number> {
  if (!business.alertEmail && !business.slackWebhookUrl) return 0;

  const keywords = await prisma.rankCheck.findMany({
    where: { businessId: business.id },
    distinct: ["keyword"],
    select: { keyword: true, locationId: true },
  });

  let alertCount = 0;

  for (const { keyword, locationId } of keywords) {
    const recent = await prisma.rankCheck.findMany({
      where: { businessId: business.id, keyword, locationId },
      orderBy: { checkedAt: "desc" },
      take: 2,
    });
    if (recent.length < 2) continue;

    const [latest, previous] = recent;
    const wentOutOfRange = previous.rank !== null && latest.rank === null;
    const droppedSignificantly =
      previous.rank !== null &&
      latest.rank !== null &&
      latest.rank - previous.rank >= RANK_DROP_THRESHOLD;

    if (wentOutOfRange || droppedSignificantly) {
      await notifyBusiness(
        business,
        `【検索順位低下】${business.name}`,
        `キーワード「${keyword}」の順位が低下しました。\n\n前回: ${previous.rank ?? "圏外"}位 → 今回: ${latest.rank ?? "圏外"}位`
      );
      alertCount++;
    }
  }

  return alertCount;
}

export async function checkAlertsForAllBusinesses(): Promise<AlertCheckResult[]> {
  const businesses = await prisma.business.findMany({
    where: {
      OR: [{ alertEmail: { not: null } }, { slackWebhookUrl: { not: null } }],
    },
  });

  const results: AlertCheckResult[] = [];
  for (const business of businesses) {
    try {
      const lowRatingAlerts = await checkLowRatingReviews(business);
      const rankDropAlerts = await checkRankDrops(business);
      results.push({ businessId: business.id, lowRatingAlerts, rankDropAlerts });
    } catch (err) {
      results.push({
        businessId: business.id,
        lowRatingAlerts: 0,
        rankDropAlerts: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
