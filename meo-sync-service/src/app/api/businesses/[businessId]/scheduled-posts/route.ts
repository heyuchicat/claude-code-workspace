import { NextResponse } from "next/server";
import { createScheduledPost, listScheduledPosts } from "@/lib/scheduled-posts-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  return NextResponse.json({ posts: await listScheduledPosts(businessId) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const locationId = body?.locationId as string | undefined;
  const summary = (body?.summary as string | undefined)?.trim();
  const mediaUrl = (body?.mediaUrl as string | undefined)?.trim();
  const scheduledAt = body?.scheduledAt as string | undefined;

  if (!locationId || !summary || !mediaUrl || !scheduledAt) {
    return NextResponse.json(
      { error: "locationId・summary・mediaUrl・scheduledAt は必須です" },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "scheduledAt は未来の日時を指定してください" },
      { status: 400 }
    );
  }

  const post = await createScheduledPost(businessId, {
    locationId,
    summary,
    mediaUrl,
    scheduledAt: scheduledDate,
  });
  return NextResponse.json({ post });
}
