import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/connections";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  await deleteConnection(businessId, "instagram");
  return NextResponse.json({ ok: true });
}
