import { NextResponse } from "next/server";
import { removeExternalListing } from "@/lib/external-listings-store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ businessId: string; listingId: string }> }
) {
  const { businessId, listingId } = await params;
  await removeExternalListing(businessId, listingId);
  return NextResponse.json({ ok: true });
}
