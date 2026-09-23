import { NextResponse } from "next/server";
import { deleteBusiness, getBusiness, updateBusinessSettings } from "@/lib/businesses";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const business = await getBusiness(businessId);
  if (!business) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ business });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);

  const input: Record<string, string | null> = {};
  for (const key of ["reportEmail", "alertEmail", "slackWebhookUrl", "prefecture"] as const) {
    if (key in (body ?? {})) {
      const value = body[key];
      input[key] = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
    }
  }

  const business = await updateBusinessSettings(businessId, input);
  return NextResponse.json({ business });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  await deleteBusiness(businessId);
  return NextResponse.json({ ok: true });
}
