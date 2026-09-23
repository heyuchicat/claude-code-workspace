import { NextResponse } from "next/server";
import { addExternalListing, listExternalListings } from "@/lib/external-listings-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  return NextResponse.json({ listings: await listExternalListings(businessId) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const platform = (body?.platform as string | undefined)?.trim();
  const url = (body?.url as string | undefined)?.trim();

  if (!platform || !url) {
    return NextResponse.json({ error: "platform と url は必須です" }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "url の形式が正しくありません" }, { status: 400 });
  }

  const listing = await addExternalListing(businessId, platform, url);
  return NextResponse.json({ listing });
}
