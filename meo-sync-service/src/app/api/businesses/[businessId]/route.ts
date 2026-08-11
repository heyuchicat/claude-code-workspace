import { NextResponse } from "next/server";
import { deleteBusiness, getBusiness } from "@/lib/businesses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const business = await getBusiness(businessId);
  if (!business) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ business });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  await deleteBusiness(businessId);
  return NextResponse.json({ ok: true });
}
