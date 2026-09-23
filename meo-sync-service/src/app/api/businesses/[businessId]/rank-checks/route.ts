import { NextResponse } from "next/server";
import { checkRank, RankCheckBlockedError } from "@/lib/rank-checker";
import { listRankChecks, recordRankCheck } from "@/lib/rank-checks-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId は必須です" }, { status: 400 });
  }
  const results = await listRankChecks(businessId, locationId);
  return NextResponse.json({ results });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const locationId = body?.locationId as string | undefined;
  const keyword = (body?.keyword as string | undefined)?.trim();
  const businessName = (body?.businessName as string | undefined)?.trim();

  if (!locationId || !keyword || !businessName) {
    return NextResponse.json(
      { error: "locationId・keyword・businessName は必須です" },
      { status: 400 }
    );
  }

  try {
    const rank = await checkRank(keyword, businessName);
    const result = await recordRankCheck(businessId, locationId, keyword, rank);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof RankCheckBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
