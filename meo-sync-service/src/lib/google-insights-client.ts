import { DailyMetric, InsightsSummary } from "./types";
import { getValidGoogleAccessToken } from "./google-business-client";

// Google Business Profile Performance API の実クライアント。
// 参考: https://developers.google.com/my-business/reference/performance/rest
// 注意: このAPIも実装時点の公式ドキュメントでフィールド名・エンドポイントを
// 必ず再確認してください(改訂されることがあります)。

const PERFORMANCE_BASE = "https://businessprofileperformance.googleapis.com/v1";

const MAP_IMPRESSION_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
];
const SEARCH_IMPRESSION_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
];
const IMPRESSION_METRICS = [...MAP_IMPRESSION_METRICS, ...SEARCH_IMPRESSION_METRICS];
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
  days = 180
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

  const searchByDate = new Map<string, number>();
  const mapByDate = new Map<string, number>();
  const callByDate = new Map<string, number>();
  const websiteByDate = new Map<string, number>();
  const directionByDate = new Map<string, number>();

  const addTo = (map: Map<string, number>, date: string, value: number) => {
    map.set(date, (map.get(date) ?? 0) + value);
  };

  for (const metricSeries of series) {
    for (const dv of metricSeries.timeSeries?.datedValues ?? []) {
      const dateStr = `${dv.date.year}-${String(dv.date.month).padStart(2, "0")}-${String(dv.date.day).padStart(2, "0")}`;
      const value = Number(dv.value ?? 0);

      if (SEARCH_IMPRESSION_METRICS.includes(metricSeries.dailyMetric)) {
        addTo(searchByDate, dateStr, value);
      } else if (MAP_IMPRESSION_METRICS.includes(metricSeries.dailyMetric)) {
        addTo(mapByDate, dateStr, value);
      } else if (metricSeries.dailyMetric === "CALL_CLICKS") {
        addTo(callByDate, dateStr, value);
      } else if (metricSeries.dailyMetric === "WEBSITE_CLICKS") {
        addTo(websiteByDate, dateStr, value);
      } else if (metricSeries.dailyMetric === "BUSINESS_DIRECTION_REQUESTS") {
        addTo(directionByDate, dateStr, value);
      }
    }
  }

  const toSeries = (map: Map<string, number>): DailyMetric[] =>
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));

  const searchViews = toSeries(searchByDate);
  const mapViews = toSeries(mapByDate);
  const callClicksDaily = toSeries(callByDate);
  const websiteClicksDaily = toSeries(websiteByDate);
  const directionRequestsDaily = toSeries(directionByDate);

  const allDates = [...new Set([...searchByDate.keys(), ...mapByDate.keys()])].sort();
  const views: DailyMetric[] = allDates.map((date) => ({
    date,
    value: (searchByDate.get(date) ?? 0) + (mapByDate.get(date) ?? 0),
  }));

  const sum = (arr: DailyMetric[]) => arr.reduce((s, v) => s + v.value, 0);

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
    searchViews,
    mapViews,
    searchKeywords: searchKeywords
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    callClicks: sum(callClicksDaily),
    websiteClicks: sum(websiteClicksDaily),
    directionRequests: sum(directionRequestsDaily),
    callClicksDaily,
    websiteClicksDaily,
    directionRequestsDaily,
  };
}
