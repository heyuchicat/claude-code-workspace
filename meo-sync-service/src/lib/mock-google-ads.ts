// Google Ads APIのダミークライアント(デモモード用)。
// 未連携の店舗でも画面上で機能イメージを確認できるようにする。

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAdKeywords(): Promise<{
  customerId: string;
  keywords: { keyword: string; matchType: string | null; status: string | null }[];
}> {
  await delay(150);
  return {
    customerId: "demo-0000000000",
    keywords: [
      { keyword: "カフェ 渋谷 ランチ", matchType: "PHRASE", status: "ENABLED" },
      { keyword: "渋谷 パフェ", matchType: "EXACT", status: "ENABLED" },
      { keyword: "渋谷 カフェ 個室", matchType: "BROAD", status: "ENABLED" },
    ],
  };
}
