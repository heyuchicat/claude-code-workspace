import { NextResponse } from "next/server";
import { listCompetitors } from "@/lib/competitors-store";
import { fetchPlaceRating } from "@/lib/google-places-client";
import { fetchGoogleBusinessLocations } from "@/lib/data-source";

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
      { error: "このロケーションはplaceIdが取得できないため比較できません" },
      { status: 422 }
    );
  }

  const competitors = await listCompetitors(businessId);

  try {
    const [own, ...competitorRatings] = await Promise.all([
      fetchPlaceRating(location.placeId),
      ...competitors.map((c) => fetchPlaceRating(c.placeId)),
    ]);

    return NextResponse.json({
      own: { ...own, name: location.name },
      competitors: competitorRatings.map((r, i) => ({ ...r, competitorId: competitors[i].id })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
