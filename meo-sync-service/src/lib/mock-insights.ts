import { DailyMetric, InsightsSummary } from "./types";

// Google Business Profile Performance API のダミークライアント(デモモード用)。
// 直近N日分の閲覧数(検索/マップ別)・アクション数(日別)・検索キーワードの疑似データを生成する。

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildSeries(days: number, base: number, amplitude: number, seedOffset: number): DailyMetric[] {
  const end = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (days - 1 - i));
    const value = Math.max(0, Math.round(base + seededRandom(i + seedOffset) * amplitude));
    return { date: date.toISOString().slice(0, 10), value };
  });
}

export async function fetchInsights(locationId: string, days = 180): Promise<InsightsSummary> {
  await delay(150);

  const searchViews = buildSeries(days, 20, 40, 1);
  const mapViews = buildSeries(days, 25, 50, 101);
  const views: DailyMetric[] = searchViews.map((v, i) => ({
    date: v.date,
    value: v.value + mapViews[i].value,
  }));
  const callClicksDaily = buildSeries(days, 0, 2, 201);
  const websiteClicksDaily = buildSeries(days, 1, 3, 301);
  const directionRequestsDaily = buildSeries(days, 1, 4, 401);

  const sum = (series: DailyMetric[]) => series.reduce((s, v) => s + v.value, 0);

  return {
    locationId,
    rangeStart: views[0]?.date ?? "",
    rangeEnd: views[views.length - 1]?.date ?? "",
    views,
    searchViews,
    mapViews,
    searchKeywords: [
      { keyword: "カフェ 渋谷", count: 84 },
      { keyword: "ランチ 渋谷", count: 61 },
      { keyword: "パフェ 渋谷", count: 37 },
      { keyword: "カフェ 個室", count: 22 },
      { keyword: "駅近 カフェ", count: 15 },
    ],
    callClicks: sum(callClicksDaily),
    websiteClicks: sum(websiteClicksDaily),
    directionRequests: sum(directionRequestsDaily),
    callClicksDaily,
    websiteClicksDaily,
    directionRequestsDaily,
  };
}
