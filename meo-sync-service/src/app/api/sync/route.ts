import { NextResponse } from "next/server";
import { AlreadyLinkedError, linkInstagramPostToGoogle } from "@/lib/sync-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const instagramPostId = body?.instagramPostId as string | undefined;
  const locationId = body?.locationId as string | undefined;

  if (!instagramPostId || !locationId) {
    return NextResponse.json(
      { error: "instagramPostId と locationId は必須です" },
      { status: 400 }
    );
  }

  try {
    const mapping = await linkInstagramPostToGoogle(instagramPostId, locationId);
    return NextResponse.json({ mapping });
  } catch (err) {
    if (err instanceof AlreadyLinkedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
