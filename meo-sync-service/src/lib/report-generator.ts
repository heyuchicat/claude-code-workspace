import { launchChromium } from "./browser";
import { fetchGoogleBusinessPosts, fetchInsights, fetchReviews } from "./data-source";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildChartSvg(views: { date: string; value: number }[]): string {
  const max = Math.max(1, ...views.map((v) => v.value));
  const width = 640;
  const height = 160;
  const barGap = 4;
  const barWidth = views.length > 0 ? width / views.length - barGap : 0;

  const bars = views
    .map((v, i) => {
      const barHeight = (v.value / max) * (height - 24);
      const x = i * (barWidth + barGap);
      const y = height - barHeight - 20;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="2" fill="#2563eb" opacity="0.85" />
        <text x="${x + barWidth / 2}" y="${height - 4}" text-anchor="middle" font-size="8" fill="#64748b">${v.date.slice(5)}</text>
      `;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="160">${bars}</svg>`;
}

export async function generateMonthlyReportHtml(
  businessId: string,
  businessName: string,
  locationId: string,
  locationName: string
): Promise<string> {
  const [insights, reviews, googlePosts] = await Promise.all([
    fetchInsights(businessId, locationId),
    fetchReviews(businessId, locationId),
    fetchGoogleBusinessPosts(businessId),
  ]);

  const totalViews = insights.views.reduce((sum, v) => sum + v.value, 0);
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "―";
  const unrepliedCount = reviews.filter((r) => !r.reply).length;
  const postsForLocation = googlePosts.filter((p) => p.locationId === locationId);

  const now = new Date();
  const rangeLabel = `${insights.rangeStart} 〜 ${insights.rangeEnd}`;

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 20mm 16mm; }
  body { font-family: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif; color: #1f2933; font-size: 11pt; line-height: 1.7; }
  h1 { font-size: 18pt; color: #1e3a8a; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 10pt; margin-bottom: 20px; }
  h2 { font-size: 13pt; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 26px; }
  .stats { display: flex; gap: 12px; margin-top: 12px; }
  .stat { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat .value { font-size: 20pt; font-weight: 700; color: #1e3a8a; }
  .stat .label { font-size: 9pt; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
  td, th { border-top: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; }
  .keyword-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .keyword { background: #eff6ff; color: #1e3a8a; border-radius: 999px; padding: 3px 10px; font-size: 9pt; }
</style>
</head>
<body>
  <h1>月次レポート</h1>
  <div class="subtitle">${escapeHtml(businessName)} / ${escapeHtml(locationName)} ・ 集計期間: ${rangeLabel} ・ 作成日: ${now.toLocaleDateString("ja-JP")}</div>

  <div class="stats">
    <div class="stat"><div class="value">${totalViews}</div><div class="label">閲覧数</div></div>
    <div class="stat"><div class="value">${insights.callClicks}</div><div class="label">電話タップ数</div></div>
    <div class="stat"><div class="value">${insights.directionRequests}</div><div class="label">ルート検索数</div></div>
    <div class="stat"><div class="value">${avgRating}</div><div class="label">平均評価</div></div>
  </div>

  <h2>日別の閲覧数推移</h2>
  ${buildChartSvg(insights.views)}

  <h2>検索キーワード(上位)</h2>
  <div class="keyword-list">
    ${insights.searchKeywords.map((k) => `<span class="keyword">${escapeHtml(k.keyword)} (${k.count})</span>`).join("") || "データがありません"}
  </div>

  <h2>クチコミ状況</h2>
  <table>
    <tr><th>件数</th><th>平均評価</th><th>未返信件数</th></tr>
    <tr><td>${reviews.length}件</td><td>${avgRating}</td><td>${unrepliedCount}件</td></tr>
  </table>

  <h2>Googleビジネスプロフィールへの投稿</h2>
  <table>
    <tr><th>投稿日</th><th>内容</th></tr>
    ${
      postsForLocation.length
        ? postsForLocation
            .slice(0, 10)
            .map(
              (p) =>
                `<tr><td>${new Date(p.createdAt).toLocaleDateString("ja-JP")}</td><td>${escapeHtml(p.summary.slice(0, 60))}</td></tr>`
            )
            .join("")
        : `<tr><td colspan="2">この期間の投稿はありません</td></tr>`
    }
  </table>
</body>
</html>`;
}

export async function generateMonthlyReportPdf(
  businessId: string,
  businessName: string,
  locationId: string,
  locationName: string
): Promise<Buffer> {
  const html = await generateMonthlyReportHtml(businessId, businessName, locationId, locationName);

  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
