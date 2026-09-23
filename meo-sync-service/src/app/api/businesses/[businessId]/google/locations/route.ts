import { NextResponse } from "next/server";
import { fetchGoogleBusinessLocations } from "@/lib/data-source";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const locations = await fetchGoogleBusinessLocations(businessId);
  return NextResponse.json({ locations });
}
