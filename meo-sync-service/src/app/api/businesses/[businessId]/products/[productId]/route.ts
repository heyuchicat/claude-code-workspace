import { NextResponse } from "next/server";
import { deleteProduct } from "@/lib/data-source";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ businessId: string; productId: string }> }
) {
  const { businessId, productId } = await params;
  try {
    await deleteProduct(businessId, decodeURIComponent(productId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
