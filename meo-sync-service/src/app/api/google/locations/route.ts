import { NextResponse } from "next/server";
import { fetchGoogleBusinessLocations } from "@/lib/mock-google-business";

export async function GET() {
  const locations = await fetchGoogleBusinessLocations();
  return NextResponse.json({ locations });
}
