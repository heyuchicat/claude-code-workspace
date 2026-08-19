import { NextResponse } from "next/server";
import { removeCompetitor } from "@/lib/competitors-store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ businessId: string; competitorId: string }> }
) {
  const { businessId, competitorId } = await params;
  await removeCompetitor(businessId, competitorId);
  return NextResponse.json({ ok: true });
}
