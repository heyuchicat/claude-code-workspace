import { NextResponse } from "next/server";
import { deleteScheduledPost } from "@/lib/scheduled-posts-store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ businessId: string; postId: string }> }
) {
  const { businessId, postId } = await params;
  await deleteScheduledPost(businessId, postId);
  return NextResponse.json({ ok: true });
}
