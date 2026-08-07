import { NextResponse } from "next/server";
import { fetchGoogleBusinessLocations } from "@/lib/data-source";

export async function GET() {
  const locations = await fetchGoogleBusinessLocations();
  return NextResponse.json({ locations });
}
