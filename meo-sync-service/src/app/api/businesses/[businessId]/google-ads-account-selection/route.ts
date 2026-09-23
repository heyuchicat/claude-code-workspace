import { NextResponse } from "next/server";
import { getPendingGoogleAdsConnection } from "@/lib/pending-google-ads-connection";
import { finalizeGoogleAdsCustomerSelection } from "@/lib/google-ads-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const pendingId = new URL(request.url).searchParams.get("pendingId");
  if (!pendingId) {
    return NextResponse.json({ error: "pendingId は必須です" }, { status: 400 });
  }

  const pending = await getPendingGoogleAdsConnection(pendingId);
  if (!pending || pending.businessId !== businessId) {
    return NextResponse.json(
      { error: "選択の有効期限が切れました。もう一度連携をやり直してください" },
      { status: 404 }
    );
  }

  return NextResponse.json({ customers: pending.customers });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const pendingId = body?.pendingId as string | undefined;
  const customerResourceName = body?.customerResourceName as string | undefined;

  if (!pendingId || !customerResourceName) {
    return NextResponse.json(
      { error: "pendingId・customerResourceName は必須です" },
      { status: 400 }
    );
  }

  const pending = await getPendingGoogleAdsConnection(pendingId);
  if (!pending || pending.businessId !== businessId) {
    return NextResponse.json(
      { error: "選択の有効期限が切れました。もう一度連携をやり直してください" },
      { status: 404 }
    );
  }

  try {
    await finalizeGoogleAdsCustomerSelection(pendingId, customerResourceName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
