import { InsightsSummary } from "./types";

// Google Business Profile Performance API のダミークライアント(デモモード用)。
// 直近14日分の閲覧数・検索キーワード・アクション数の疑似データを生成する。

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function fetchInsights(locationId: string): Promise<InsightsSummary> {
  await delay(150);

  const days = 14;
  const end = new Date();
  const views = Array.from({ length: days }, (_, i) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (days - 1 - i));
    const value = Math.round(30 + seededRandom(i + 1) * 60);
    return { date: date.toISOString().slice(0, 10), value };
  });

  return {
    locationId,
    rangeStart: views[0].date,
    rangeEnd: views[views.length - 1].date,
    views,
    searchKeywords: [
      { keyword: "カフェ 渋谷", count: 84 },
      { keyword: "ランチ 渋谷", count: 61 },
      { keyword: "パフェ 渋谷", count: 37 },
      { keyword: "カフェ 個室", count: 22 },
      { keyword: "駅近 カフェ", count: 15 },
    ],
    callClicks: 23,
    websiteClicks: 41,
    directionRequests: 58,
  };
}
