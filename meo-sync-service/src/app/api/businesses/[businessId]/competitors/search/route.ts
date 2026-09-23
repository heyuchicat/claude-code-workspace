import { NextResponse } from "next/server";
import { searchPlacesByText } from "@/lib/google-places-client";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "q は必須です" }, { status: 400 });
  }
  try {
    const results = await searchPlacesByText(q);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
