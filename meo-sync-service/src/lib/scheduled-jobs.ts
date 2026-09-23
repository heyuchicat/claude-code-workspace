// 4つの自動化ジョブの本体。外部cronエンドポイント(/api/cron/*)と、
// アプリ起動中に自動実行される内蔵スケジューラ(instrumentation.ts)の
// 両方から同じロジックを呼び出せるようにここへ集約している。

import { prisma } from "./db";
import { createGoogleBusinessPost, fetchGoogleBusinessLocations } from "./data-source";
import { listDuePosts, markFailed, markPublished } from "./scheduled-posts-store";
import { listAllTrackedKeywords } from "./tracked-keywords-store";
import { checkRank, RankCheckBlockedError } from "./rank-checker";
import { recordRankCheck } from "./rank-checks-store";
import { checkAlertsForAllBusinesses } from "./alerts";
import { generateMonthlyReportPdf } from "./report-generator";
import { sendMail } from "./mailer";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function publishDueScheduledPosts() {
  const duePosts = await listDuePosts();
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const post of duePosts) {
    try {
      await createGoogleBusinessPost(post.businessId, {
        locationId: post.locationId,
        summary: post.summary,
        mediaUrl: post.mediaUrl,
        sourceInstagramPostId: "",
      });
      await markPublished(post.id);
      results.push({ id: post.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markFailed(post.id, message);
      results.push({ id: post.id, ok: false, error: message });
    }
  }

  return results;
}

export async function checkAllTrackedKeywordRanks() {
  const keywords = await listAllTrackedKeywords();
  const results: { id: string; ok: boolean; rank?: number | null; error?: string }[] = [];

  for (const k of keywords) {
    try {
      const rank = await checkRank(k.keyword, k.businessNameMatch);
      await recordRankCheck(k.businessId, k.locationId, k.keyword, rank);
      results.push({ id: k.id, ok: true, rank });
    } catch (err) {
      const message =
        err instanceof RankCheckBlockedError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      results.push({ id: k.id, ok: false, error: message });
    }
  }

  return results;
}

export async function checkAllAlerts() {
  return checkAlertsForAllBusinesses();
}

// 前回送付から30日以上経過している(または未送付)の店舗にのみ送る。
// 内蔵スケジューラは1日おきに呼び出す想定なので、これで「月1回」相当になる。
export async function sendDueMonthlyReports() {
  const businesses = await prisma.business.findMany({
    where: { reportEmail: { not: null } },
  });

  const results: { businessId: string; ok: boolean; skipped?: boolean; error?: string }[] = [];

  for (const business of businesses) {
    const dueForSend =
      !business.lastMonthlyReportSentAt ||
      Date.now() - business.lastMonthlyReportSentAt.getTime() >= THIRTY_DAYS_MS;
    if (!dueForSend) {
      results.push({ businessId: business.id, ok: true, skipped: true });
      continue;
    }

    try {
      const locations = await fetchGoogleBusinessLocations(business.id);
      for (const location of locations) {
        const pdf = await generateMonthlyReportPdf(
          business.id,
          business.name,
          location.id,
          location.name
        );
        await sendMail({
          to: business.reportEmail!,
          subject: `【月次レポート】${business.name} / ${location.name}`,
          text: "月次レポートを添付いたします。",
          attachments: [
            {
              filename: `report-${business.name}-${location.name}.pdf`,
              content: pdf,
              contentType: "application/pdf",
            },
          ],
        });
      }
      await prisma.business.update({
        where: { id: business.id },
        data: { lastMonthlyReportSentAt: new Date() },
      });
      results.push({ businessId: business.id, ok: true });
    } catch (err) {
      results.push({
        businessId: business.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
