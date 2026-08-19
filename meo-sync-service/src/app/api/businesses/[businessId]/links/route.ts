import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  return NextResponse.json({ links: await store.listLinkMappings(businessId) });
}
