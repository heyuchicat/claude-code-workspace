import { NextResponse } from "next/server";
import { fetchInstagramAccount } from "@/lib/data-source";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const account = await fetchInstagramAccount(businessId);
  return NextResponse.json({ account });
}
