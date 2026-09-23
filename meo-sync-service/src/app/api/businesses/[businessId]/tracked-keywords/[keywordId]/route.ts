import { NextResponse } from "next/server";
import { removeTrackedKeyword } from "@/lib/tracked-keywords-store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ businessId: string; keywordId: string }> }
) {
  const { businessId, keywordId } = await params;
  await removeTrackedKeyword(businessId, keywordId);
  return NextResponse.json({ ok: true });
}
