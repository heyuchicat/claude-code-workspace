import { NextResponse } from "next/server";
import { addTrackedKeyword, listTrackedKeywords } from "@/lib/tracked-keywords-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  return NextResponse.json({ keywords: await listTrackedKeywords(businessId) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const locationId = body?.locationId as string | undefined;
  const keyword = (body?.keyword as string | undefined)?.trim();
  const businessNameMatch = (body?.businessNameMatch as string | undefined)?.trim();

  if (!locationId || !keyword || !businessNameMatch) {
    return NextResponse.json(
      { error: "locationId・keyword・businessNameMatch は必須です" },
      { status: 400 }
    );
  }

  const record = await addTrackedKeyword(businessId, locationId, keyword, businessNameMatch);
  return NextResponse.json({ keyword: record });
}
