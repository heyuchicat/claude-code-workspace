import { NextResponse } from "next/server";
import { fetchInsights } from "@/lib/data-source";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId は必須です" }, { status: 400 });
  }
  const daysParam = url.searchParams.get("days");
  const days = daysParam ? Number(daysParam) : 14;
  const insights = await fetchInsights(businessId, locationId, days);
  return NextResponse.json({ insights });
}
