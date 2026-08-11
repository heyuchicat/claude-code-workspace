import { NextResponse } from "next/server";
import { fetchGoogleBusinessLocations } from "@/lib/data-source";
import { buildReviewRequestQrCodeDataUrl, buildReviewRequestUrl } from "@/lib/review-link";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId は必須です" }, { status: 400 });
  }

  const locations = await fetchGoogleBusinessLocations(businessId);
  const location = locations.find((l) => l.id === locationId);
  if (!location) {
    return NextResponse.json({ error: "ロケーションが見つかりません" }, { status: 404 });
  }
  if (!location.placeId) {
    return NextResponse.json(
      { error: "このロケーションはplaceIdが取得できないため、クチコミ依頼リンクを生成できません" },
      { status: 422 }
    );
  }

  const url = buildReviewRequestUrl(location.placeId);
  const qrCodeDataUrl = await buildReviewRequestQrCodeDataUrl(location.placeId);
  return NextResponse.json({ url, qrCodeDataUrl });
}
