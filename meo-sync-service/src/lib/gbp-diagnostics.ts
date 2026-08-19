import { fetchGbpProfileFields } from "./data-source";
import { generateText, isAiConfigured } from "./ai-client";
import type { GoogleBusinessPost, GoogleReview } from "./types";

export type ChecklistItem = { label: string; ok: boolean };

export type GbpDiagnostics = {
  scorePercent: number;
  grade: string;
  comment: string;
  basicInfo: ChecklistItem[];
  engagement: ChecklistItem[];
};

function scoreToGrade(percent: number): string {
  if (percent >= 85) return "優";
  if (percent >= 60) return "良";
  if (percent >= 40) return "可";
  return "要改善";
}

function fallbackComment(diagnostics: Omit<GbpDiagnostics, "comment">): string {
  const failed = [...diagnostics.basicInfo, ...diagnostics.engagement].filter((i) => !i.ok);
  if (failed.length === 0) {
    return `診断結果は「${diagnostics.grade}」です。チェック項目はすべて満たされています。この状態を維持してください。`;
  }
  const list = failed.map((f) => f.label).join("、");
  return `診断結果は「${diagnostics.grade}」(${diagnostics.scorePercent}%)です。改善余地があるのは次の項目です: ${list}。優先度が高いものから順に整備することをおすすめします。`;
}

export async function buildGbpDiagnostics(
  businessId: string,
  locationId: string,
  locationName: string,
  googlePosts: GoogleBusinessPost[],
  reviews: GoogleReview[]
): Promise<GbpDiagnostics> {
  const profile = await fetchGbpProfileFields(businessId, locationId);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentPosts = googlePosts.filter(
    (p) => p.locationId === locationId && new Date(p.createdAt) >= threeMonthsAgo
  );
  const postsPerWeek = recentPosts.length / 13; // 約3ヶ月=13週

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const repliedCount = reviews.filter((r) => r.reply).length;
  const replyRate = reviews.length ? repliedCount / reviews.length : 0;

  const basicInfo: ChecklistItem[] = [
    { label: "ビジネス名が設定されているか", ok: profile.hasName },
    { label: "メインカテゴリが設定されているか", ok: profile.hasCategory },
    { label: "ビジネスの説明が設定されているか", ok: profile.hasDescription },
    { label: "住所が設定されているか", ok: profile.hasAddress },
    { label: "電話番号が設定されているか", ok: profile.hasPhone },
    { label: "営業時間が設定されているか", ok: profile.hasHours },
    { label: "ウェブサイトURLが設定されているか", ok: profile.hasWebsite },
  ];

  const engagement: ChecklistItem[] = [
    { label: "週1投稿以上のペースを維持しているか(直近3ヶ月)", ok: postsPerWeek >= 1 },
    { label: "平均評価が3.7以上か", ok: avgRating >= 3.7 },
    { label: "クチコミ件数が合計30件以上か", ok: reviews.length >= 30 },
    { label: "クチコミ返信率が30%以上か", ok: replyRate >= 0.3 },
  ];

  const allItems = [...basicInfo, ...engagement];
  const scorePercent = Math.round((allItems.filter((i) => i.ok).length / allItems.length) * 100);
  const grade = scoreToGrade(scorePercent);

  const base = { scorePercent, grade, basicInfo, engagement };

  if (!isAiConfigured()) {
    return { ...base, comment: fallbackComment(base) };
  }

  try {
    const checklistText = allItems.map((i) => `- ${i.label}: ${i.ok ? "◯" : "✕"}`).join("\n");
    const prompt = `あなたはローカルSEO(MEO)の専門コンサルタントです。以下は「${locationName}」のGoogleビジネスプロフィール運用チェック結果です。

診断スコア: ${scorePercent}%(${grade})

${checklistText}

補足データ: 直近3ヶ月の週あたり投稿数 約${postsPerWeek.toFixed(1)}件、平均評価 ${avgRating.toFixed(1)}、クチコミ件数 ${reviews.length}件、クチコミ返信率 ${Math.round(replyRate * 100)}%

この結果をもとに、店舗運営者向けに日本語で200〜300字程度の診断コメントを書いてください。良い点・改善が必要な点・優先して対応すべきことを具体的に述べてください。丁寧語で、断定的な決めつけは避けてください。`;

    const comment = await generateText(prompt, 500);
    return { ...base, comment: comment || fallbackComment(base) };
  } catch {
    return { ...base, comment: fallbackComment(base) };
  }
}
