import { NextResponse } from "next/server";
import { fetchAdKeywords } from "@/lib/data-source";
import { listAdKeywords, replaceAdKeywords } from "@/lib/ad-keywords-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  return NextResponse.json({ keywords: await listAdKeywords(businessId) });
}

// Google Adsから最新のキーワード一覧を取得し、保存済み一覧を置き換える。
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  try {
    const { customerId, keywords } = await fetchAdKeywords(businessId);
    const stored = await replaceAdKeywords(businessId, customerId, keywords);
    return NextResponse.json({ keywords: stored });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
