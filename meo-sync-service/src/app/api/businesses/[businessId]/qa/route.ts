import { NextResponse } from "next/server";
import { fetchQA } from "@/lib/data-source";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId は必須です" }, { status: 400 });
  }
  const entries = await fetchQA(businessId, locationId);
  return NextResponse.json({ entries });
}
