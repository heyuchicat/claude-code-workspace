import { launchChromium } from "./browser";
import { fetchGoogleBusinessPosts, fetchInsights, fetchReviews } from "./data-source";
import type { DailyMetric, GoogleReview } from "./types";
import { buildGbpDiagnostics, type GbpDiagnostics } from "./gbp-diagnostics";

const REPORT_HISTORY_DAYS = 180; // 直近およそ6ヶ月分を月別推移として集計する

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}/${m}`;
}

function bucketMonthly(series: DailyMetric[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of series) {
    map.set(monthKey(d.date), (map.get(monthKey(d.date)) ?? 0) + d.value);
  }
  return map;
}

function sortedMonthKeys(...maps: Map<string, number>[]): string[] {
  const keys = new Set<string>();
  for (const m of maps) for (const k of m.keys()) keys.add(k);
  return [...keys].sort();
}

const SERIES_COLORS = ["#f5b97a", "#b79ce0", "#8fb8f0"];

function buildStackedBarChart(
  months: string[],
  seriesList: { label: string; values: number[] }[]
): string {
  const width = 640;
  const height = 200;
  const padding = 20;
  const chartHeight = height - padding - 22;
  const totals = months.map((_, i) => seriesList.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const barGap = 10;
  const barWidth = months.length > 0 ? (width - padding * 2) / months.length - barGap : 0;

  let bars = "";
  months.forEach((m, i) => {
    let yOffset = height - padding - 16;
    const x = padding + i * (barWidth + barGap);
    seriesList.forEach((ser, si) => {
      const v = ser.values[i] ?? 0;
      const h = (v / max) * chartHeight;
      const y = yOffset - h;
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${SERIES_COLORS[si % SERIES_COLORS.length]}" opacity="0.9" />`;
      yOffset -= h;
    });
    bars += `<text x="${x + barWidth / 2}" y="${height - 4}" text-anchor="middle" font-size="7.5" fill="#64748b">${monthLabel(m)}</text>`;
  });

  const legend = seriesList
    .map(
      (ser, si) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:14px;"><span style="width:9px;height:9px;background:${SERIES_COLORS[si % SERIES_COLORS.length]};display:inline-block;border-radius:2px;"></span>${escapeHtml(ser.label)}</span>`
    )
    .join("");

  return `<div>
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${bars}</svg>
    <div style="font-size:9pt;color:#64748b;margin-top:2px;">${legend}</div>
  </div>`;
}

const PIE_COLORS = ["#f5b97a", "#b79ce0", "#8fb8f0"];

function buildPieChart(slices: { label: string; value: number }[]): string {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 70;
  const cy = 70;
  const r = 60;
  let angle = -90;
  let paths = "";
  const toRad = (a: number) => (a * Math.PI) / 180;
  slices.forEach((s, i) => {
    const fraction = s.value / total;
    const startAngle = angle;
    const endAngle = angle + fraction * 360;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z" fill="${PIE_COLORS[i % PIE_COLORS.length]}" opacity="0.9" />`;
    angle = endAngle;
  });
  const legend = slices
    .map(
      (s, i) =>
        `<div style="display:flex;align-items:center;gap:6px;font-size:9pt;color:#334155;"><span style="width:9px;height:9px;background:${PIE_COLORS[i % PIE_COLORS.length]};display:inline-block;border-radius:2px;"></span>${escapeHtml(s.label)} ${Math.round((s.value / total) * 100)}%</div>`
    )
    .join("");
  return `<div style="display:flex;align-items:center;gap:16px;">
    <svg viewBox="0 0 140 140" width="140" height="140">${paths}</svg>
    <div style="display:flex;flex-direction:column;gap:4px;">${legend}</div>
  </div>`;
}

function buildLineChart(months: string[], values: number[], formatValue: (v: number) => string): string {
  const width = 640;
  const height = 130;
  const padding = 24;
  const max = Math.max(0.01, ...values);
  const stepX = months.length > 1 ? (width - padding * 2) / (months.length - 1) : 0;
  const coords = values.map((v, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (v / max) * (height - padding * 2);
    return { x, y, v };
  });
  const points = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const dots = coords
    .map((c) => `<circle cx="${c.x}" cy="${c.y}" r="2.5" fill="#2563eb" /><text x="${c.x}" y="${c.y - 8}" text-anchor="middle" font-size="7" fill="#334155">${formatValue(c.v)}</text>`)
    .join("");
  const labels = months
    .map((m, i) => `<text x="${padding + i * stepX}" y="${height - 6}" text-anchor="middle" font-size="7" fill="#64748b">${monthLabel(m)}</text>`)
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
    <polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="2" />
    ${dots}${labels}
  </svg>`;
}

function buildSimpleBarChart(points: { label: string; value: number }[], color = "#b79ce0"): string {
  const width = 420;
  const height = 130;
  const padding = 16;
  const max = Math.max(1, ...points.map((p) => p.value));
  const barGap = 8;
  const barWidth = points.length > 0 ? (width - padding * 2) / points.length - barGap : 0;
  const bars = points
    .map((p, i) => {
      const h = (p.value / max) * (height - padding - 18);
      const x = padding + i * (barWidth + barGap);
      const y = height - padding - h;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="2" fill="${color}" opacity="0.9" /><text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" font-size="8" fill="#334155">${p.value}</text><text x="${x + barWidth / 2}" y="${height - 4}" text-anchor="middle" font-size="8" fill="#64748b">${escapeHtml(p.label)}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${bars}</svg>`;
}

const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"]; // index = Date#getDay()
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 月〜日の表示順

function bucketByWeekday(series: DailyMetric[]): { label: string; value: number }[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const d of series) {
    const day = new Date(`${d.date}T00:00:00`).getDay();
    totals[day] += d.value;
  }
  return WEEKDAY_ORDER.map((i) => ({ label: WEEKDAY_LABELS_JA[i], value: totals[i] }));
}

function bucketReviewsByMonth(reviews: GoogleReview[]): Map<string, { count: number; avgRating: number }> {
  const raw = new Map<string, { sum: number; count: number }>();
  for (const r of reviews) {
    const k = monthKey(r.createTime);
    const cur = raw.get(k) ?? { sum: 0, count: 0 };
    cur.sum += r.rating;
    cur.count += 1;
    raw.set(k, cur);
  }
  const result = new Map<string, { count: number; avgRating: number }>();
  for (const [k, v] of raw) {
    result.set(k, { count: v.count, avgRating: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0 });
  }
  return result;
}

function monthlyTrendTable(
  months: string[],
  columns: { label: string; getValue: (m: string) => number }[]
): string {
  const rows = months
    .slice()
    .reverse()
    .map((m) => {
      const cells = columns.map((c) => `<td>${c.getValue(m).toLocaleString("ja-JP")}</td>`).join("");
      return `<tr><td>${monthLabel(m)}</td>${cells}</tr>`;
    })
    .join("");
  const headerCells = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  return `<table><tr><th>月</th>${headerCells}</tr>${rows}</table>`;
}

function diagnosticsSectionHtml(diagnostics: GbpDiagnostics | null): string {
  if (!diagnostics) {
    return `<h2>AI運用アシスタント</h2><p class="notice-box">Google連携が完了していない、または生成AIコメント機能(ANTHROPIC_API_KEY)が未設定のため、この回はスキップされました。</p>`;
  }
  const groupRows = (items: { label: string; ok: boolean }[]) =>
    items
      .map((it) => `<tr><td>${escapeHtml(it.label)}</td><td class="${it.ok ? "ok" : "ng"}">${it.ok ? "◯" : "✕"}</td></tr>`)
      .join("");

  return `
  <h2>AI運用アシスタント(Googleビジネスプロフィール運用診断)</h2>
  <div class="stats">
    <div class="stat"><div class="value">${diagnostics.scorePercent}%</div><div class="label">診断スコア(${escapeHtml(diagnostics.grade)})</div></div>
  </div>
  <p style="margin-top:10px;">${escapeHtml(diagnostics.comment)}</p>
  <h3>GBP店舗基本情報</h3>
  <table><tr><th>項目</th><th>結果</th></tr>${groupRows(diagnostics.basicInfo)}</table>
  <h3>投稿・写真・クチコミ</h3>
  <table><tr><th>項目</th><th>結果</th></tr>${groupRows(diagnostics.engagement)}</table>
  `;
}

export async function generateMonthlyReportHtml(
  businessId: string,
  businessName: string,
  locationId: string,
  locationName: string
): Promise<string> {
  const [insights, reviews, googlePosts] = await Promise.all([
    fetchInsights(businessId, locationId, REPORT_HISTORY_DAYS),
    fetchReviews(businessId, locationId),
    fetchGoogleBusinessPosts(businessId),
  ]);

  let diagnostics: GbpDiagnostics | null = null;
  try {
    diagnostics = await buildGbpDiagnostics(businessId, locationId, locationName, googlePosts, reviews);
  } catch {
    diagnostics = null;
  }

  const postsForLocation = googlePosts.filter((p) => p.locationId === locationId);
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "―";
  const unrepliedCount = reviews.filter((r) => !r.reply).length;

  const searchByMonth = bucketMonthly(insights.searchViews);
  const mapByMonth = bucketMonthly(insights.mapViews);
  const callByMonth = bucketMonthly(insights.callClicksDaily);
  const websiteByMonth = bucketMonthly(insights.websiteClicksDaily);
  const directionByMonth = bucketMonthly(insights.directionRequestsDaily);
  const reviewsByMonth = bucketReviewsByMonth(reviews);

  const months = sortedMonthKeys(searchByMonth, mapByMonth, callByMonth, websiteByMonth, directionByMonth);
  const recentMonths = months.slice(-6);

  const totalSearchViews = insights.searchViews.reduce((s, v) => s + v.value, 0);
  const totalMapViews = insights.mapViews.reduce((s, v) => s + v.value, 0);
  const totalViews = totalSearchViews + totalMapViews;

  const actionRateByMonth = recentMonths.map((m) => {
    const views = (searchByMonth.get(m) ?? 0) + (mapByMonth.get(m) ?? 0);
    const actions = (callByMonth.get(m) ?? 0) + (websiteByMonth.get(m) ?? 0) + (directionByMonth.get(m) ?? 0);
    return views > 0 ? (actions / views) * 100 : 0;
  });

  const weekdayCallData = bucketByWeekday(insights.callClicksDaily);

  const now = new Date();
  const rangeLabel = `${insights.rangeStart} 〜 ${insights.rangeEnd}`;

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif; color: #1f2933; font-size: 10.5pt; line-height: 1.65; }
  h1 { font-size: 18pt; color: #1e3a8a; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 10pt; margin-bottom: 20px; }
  h2 { font-size: 13pt; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 28px; page-break-after: avoid; }
  h3 { font-size: 11pt; color: #1e3a8a; margin-top: 16px; }
  .stats { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
  .stat { flex: 1; min-width: 110px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat .value { font-size: 18pt; font-weight: 700; color: #1e3a8a; }
  .stat .label { font-size: 8.5pt; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
  td, th { border-top: 1px solid #e2e8f0; padding: 5px 4px; text-align: left; }
  td.ok { color: #16a34a; font-weight: 700; }
  td.ng { color: #dc2626; font-weight: 700; }
  .keyword-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .keyword { background: #eff6ff; color: #1e3a8a; border-radius: 999px; padding: 3px 10px; font-size: 9pt; }
  .row2 { display: flex; gap: 20px; align-items: flex-start; margin-top: 10px; flex-wrap: wrap; }
  .row2 > div { flex: 1; min-width: 260px; }
  .notice-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; color: #475569; font-size: 9.5pt; }
  .section { page-break-inside: avoid; }
</style>
</head>
<body>
  <h1>店舗マーケティング管理ツール 月次レポート</h1>
  <div class="subtitle">${escapeHtml(businessName)} / ${escapeHtml(locationName)} ・ 集計期間: ${rangeLabel} ・ 作成日: ${now.toLocaleDateString("ja-JP")}</div>

  <div class="section">
    <div class="stats">
      <div class="stat"><div class="value">${totalViews.toLocaleString("ja-JP")}</div><div class="label">総閲覧ユーザー数</div></div>
      <div class="stat"><div class="value">${insights.callClicks.toLocaleString("ja-JP")}</div><div class="label">電話タップ数</div></div>
      <div class="stat"><div class="value">${insights.directionRequests.toLocaleString("ja-JP")}</div><div class="label">ルート検索数</div></div>
      <div class="stat"><div class="value">${avgRating}</div><div class="label">平均評価</div></div>
    </div>
  </div>

  <div class="section">
    <h2>ユーザーがビジネス情報の検索に使ったGoogleサービス</h2>
    <div class="row2">
      <div>${buildStackedBarChart(recentMonths, [
        { label: "検索での閲覧ユーザー数", values: recentMonths.map((m) => searchByMonth.get(m) ?? 0) },
        { label: "マップでの閲覧ユーザー数", values: recentMonths.map((m) => mapByMonth.get(m) ?? 0) },
      ])}</div>
      <div>${buildPieChart([
        { label: "検索での閲覧ユーザー数", value: totalSearchViews },
        { label: "マップでの閲覧ユーザー数", value: totalMapViews },
      ])}</div>
    </div>
    ${monthlyTrendTable(recentMonths, [
      { label: "合計", getValue: (m) => (searchByMonth.get(m) ?? 0) + (mapByMonth.get(m) ?? 0) },
      { label: "検索での閲覧ユーザー数", getValue: (m) => searchByMonth.get(m) ?? 0 },
      { label: "マップでの閲覧ユーザー数", getValue: (m) => mapByMonth.get(m) ?? 0 },
    ])}
  </div>

  <div class="section">
    <h2>Google ユーザーの反応</h2>
    <div class="row2">
      <div>${buildStackedBarChart(recentMonths, [
        { label: "電話をかける", values: recentMonths.map((m) => callByMonth.get(m) ?? 0) },
        { label: "ルートの検索", values: recentMonths.map((m) => directionByMonth.get(m) ?? 0) },
        { label: "ウェブサイトへのアクセス", values: recentMonths.map((m) => websiteByMonth.get(m) ?? 0) },
      ])}</div>
      <div>${buildPieChart([
        { label: "電話をかける", value: insights.callClicks },
        { label: "ルートの検索", value: insights.directionRequests },
        { label: "ウェブサイトへのアクセス", value: insights.websiteClicks },
      ])}</div>
    </div>
    ${monthlyTrendTable(recentMonths, [
      {
        label: "合計",
        getValue: (m) => (callByMonth.get(m) ?? 0) + (directionByMonth.get(m) ?? 0) + (websiteByMonth.get(m) ?? 0),
      },
      { label: "電話をかける", getValue: (m) => callByMonth.get(m) ?? 0 },
      { label: "ルートの検索", getValue: (m) => directionByMonth.get(m) ?? 0 },
      { label: "ウェブサイトへのアクセス", getValue: (m) => websiteByMonth.get(m) ?? 0 },
    ])}
  </div>

  <div class="section">
    <h2>アクション率の推移</h2>
    <p class="notice-box">アクション率 = (電話+ルート検索+サイトアクセス) ÷ 閲覧ユーザー数</p>
    ${buildLineChart(recentMonths, actionRateByMonth, (v) => `${v.toFixed(1)}%`)}
  </div>

  <div class="section">
    <h2>曜日別の電話着信分析</h2>
    ${buildSimpleBarChart(weekdayCallData)}
  </div>

  <div class="section">
    <h2>検索キーワード(表示回数)</h2>
    <div class="keyword-list">
      ${insights.searchKeywords.map((k) => `<span class="keyword">${escapeHtml(k.keyword)} (${k.count.toLocaleString("ja-JP")})</span>`).join("") || "データがありません"}
    </div>
  </div>

  <div class="section">
    <h2>クチコミ分析</h2>
    ${buildStackedBarChart(recentMonths, [
      { label: "クチコミ件数", values: recentMonths.map((m) => reviewsByMonth.get(m)?.count ?? 0) },
    ])}
    <table>
      <tr><th>月</th><th>件数</th><th>平均評価</th></tr>
      ${recentMonths
        .slice()
        .reverse()
        .map((m) => {
          const d = reviewsByMonth.get(m);
          return `<tr><td>${monthLabel(m)}</td><td>${d?.count ?? 0}</td><td>${d?.avgRating ?? "―"}</td></tr>`;
        })
        .join("")}
    </table>
    <p style="margin-top:8px;">現在の累計: ${reviews.length}件 ・ 平均評価 ${avgRating} ・ 未返信 ${unrepliedCount}件</p>
  </div>

  <div class="section">
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
  </div>

  <div class="section">
    ${diagnosticsSectionHtml(diagnostics)}
  </div>
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
