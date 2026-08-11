import { DailyMetric, InsightsSummary } from "./types";
import { getValidGoogleAccessToken } from "./google-business-client";

// Google Business Profile Performance API の実クライアント。
// 参考: https://developers.google.com/my-business/reference/performance/rest
// 注意: このAPIも実装時点の公式ドキュメントでフィールド名・エンドポイントを
// 必ず再確認してください(改訂されることがあります)。

const PERFORMANCE_BASE = "https://businessprofileperformance.googleapis.com/v1";

const IMPRESSION_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
];
const ACTION_METRICS = [
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
];

function formatDate(d: Date) {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

type DailyMetricTimeSeries = {
  dailyMetric: string;
  timeSeries: {
    datedValues: { date: { year: number; month: number; day: number }; value?: string }[];
  };
};

export async function fetchRealInsights(
  businessId: string,
  locationId: string,
  days = 14
): Promise<InsightsSummary> {
  const { accessToken } = await getValidGoogleAccessToken(businessId);

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const allMetrics = [...IMPRESSION_METRICS, ...ACTION_METRICS];
  const url = new URL(
    `${PERFORMANCE_BASE}/${locationId}:fetchMultiDailyMetricsTimeSeries`
  );
  for (const m of allMetrics) url.searchParams.append("dailyMetrics", m);
  const s = formatDate(start);
  const e = formatDate(end);
  url.searchParams.set("dailyRange.start_date.year", String(s.year));
  url.searchParams.set("dailyRange.start_date.month", String(s.month));
  url.searchParams.set("dailyRange.start_date.day", String(s.day));
  url.searchParams.set("dailyRange.end_date.year", String(e.year));
  url.searchParams.set("dailyRange.end_date.month", String(e.month));
  url.searchParams.set("dailyRange.end_date.day", String(e.day));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`インサイト取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  const series = (data.multiDailyMetricTimeSeries?.[0]?.dailyMetricTimeSeries ??
    []) as DailyMetricTimeSeries[];

  const viewsByDate = new Map<string, number>();
  let callClicks = 0;
  let websiteClicks = 0;
  let directionRequests = 0;

  for (const metricSeries of series) {
    for (const dv of metricSeries.timeSeries?.datedValues ?? []) {
      const dateStr = `${dv.date.year}-${String(dv.date.month).padStart(2, "0")}-${String(dv.date.day).padStart(2, "0")}`;
      const value = Number(dv.value ?? 0);

      if (IMPRESSION_METRICS.includes(metricSeries.dailyMetric)) {
        viewsByDate.set(dateStr, (viewsByDate.get(dateStr) ?? 0) + value);
      } else if (metricSeries.dailyMetric === "CALL_CLICKS") {
        callClicks += value;
      } else if (metricSeries.dailyMetric === "WEBSITE_CLICKS") {
        websiteClicks += value;
      } else if (metricSeries.dailyMetric === "BUSINESS_DIRECTION_REQUESTS") {
        directionRequests += value;
      }
    }
  }

  const views: DailyMetric[] = [...viewsByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  const keywordsUrl = new URL(
    `${PERFORMANCE_BASE}/${locationId}/searchkeywords/impressions/monthly`
  );
  const keywordsRes = await fetch(keywordsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchKeywords: { keyword: string; count: number }[] = [];
  if (keywordsRes.ok) {
    const keywordsData = await keywordsRes.json();
    for (const entry of keywordsData.searchKeywordsCounts ?? []) {
      searchKeywords.push({
        keyword: entry.searchKeyword ?? "",
        count: Number(entry.insightsValue?.value ?? 0),
      });
    }
  }

  return {
    locationId,
    rangeStart: views[0]?.date ?? "",
    rangeEnd: views[views.length - 1]?.date ?? "",
    views,
    searchKeywords: searchKeywords
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    callClicks,
    websiteClicks,
    directionRequests,
  };
}
