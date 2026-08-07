import { NextResponse } from "next/server";
import { syncAllUnlinkedPosts } from "@/lib/sync-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locationId = body?.locationId as string | undefined;

  if (!locationId) {
    return NextResponse.json(
      { error: "locationId は必須です" },
      { status: 400 }
    );
  }

  const results = await syncAllUnlinkedPosts(locationId);
  return NextResponse.json({ results });
}
