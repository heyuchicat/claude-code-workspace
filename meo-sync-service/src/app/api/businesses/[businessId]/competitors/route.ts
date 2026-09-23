import { NextResponse } from "next/server";
import { addCompetitor, listCompetitors } from "@/lib/competitors-store";
import { fetchPlaceRating } from "@/lib/google-places-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  return NextResponse.json({ competitors: await listCompetitors(businessId) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const placeId = body?.placeId as string | undefined;

  if (!placeId) {
    return NextResponse.json({ error: "placeId は必須です" }, { status: 400 });
  }

  try {
    const info = await fetchPlaceRating(placeId);
    const competitor = await addCompetitor(businessId, placeId, info.name);
    return NextResponse.json({ competitor });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
