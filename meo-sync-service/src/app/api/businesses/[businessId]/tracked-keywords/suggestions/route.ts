import { NextResponse } from "next/server";
import { fetchInsights } from "@/lib/data-source";
import { listTrackedKeywords } from "@/lib/tracked-keywords-store";

// 実際にお客様がGoogle検索/マップでこの店舗を見つけるのに使ったキーワード
// (公式Performance APIのsearchKeywords指標)を、追跡候補として提案する。
// すでに追跡登録済みのキーワードは候補から除外する。

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId は必須です" }, { status: 400 });
  }

  const [insights, tracked] = await Promise.all([
    fetchInsights(businessId, locationId),
    listTrackedKeywords(businessId),
  ]);

  const trackedKeywordSet = new Set(
    tracked.filter((k) => k.locationId === locationId).map((k) => k.keyword)
  );

  const suggestions = insights.searchKeywords
    .filter((k) => k.keyword && !trackedKeywordSet.has(k.keyword))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return NextResponse.json({ suggestions });
}
