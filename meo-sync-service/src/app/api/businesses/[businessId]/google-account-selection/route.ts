import { NextResponse } from "next/server";
import { getPendingGoogleConnection } from "@/lib/pending-google-connection";
import { finalizeGoogleAccountSelection } from "@/lib/google-business-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const pendingId = new URL(request.url).searchParams.get("pendingId");
  if (!pendingId) {
    return NextResponse.json({ error: "pendingId は必須です" }, { status: 400 });
  }

  const pending = await getPendingGoogleConnection(pendingId);
  if (!pending || pending.businessId !== businessId) {
    return NextResponse.json(
      { error: "選択の有効期限が切れました。もう一度連携をやり直してください" },
      { status: 404 }
    );
  }

  return NextResponse.json({ accounts: pending.accounts });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const pendingId = body?.pendingId as string | undefined;
  const accountResourceName = body?.accountResourceName as string | undefined;

  if (!pendingId || !accountResourceName) {
    return NextResponse.json(
      { error: "pendingId・accountResourceName は必須です" },
      { status: 400 }
    );
  }

  const pending = await getPendingGoogleConnection(pendingId);
  if (!pending || pending.businessId !== businessId) {
    return NextResponse.json(
      { error: "選択の有効期限が切れました。もう一度連携をやり直してください" },
      { status: 404 }
    );
  }

  try {
    await finalizeGoogleAccountSelection(pendingId, accountResourceName);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
