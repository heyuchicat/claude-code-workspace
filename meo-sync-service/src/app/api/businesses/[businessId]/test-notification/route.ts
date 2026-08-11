import { NextResponse } from "next/server";
import { getBusiness } from "@/lib/businesses";
import { notifyBusiness } from "@/lib/notify";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const business = await getBusiness(businessId);
  if (!business) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  if (!business.alertEmail && !business.slackWebhookUrl) {
    return NextResponse.json(
      { error: "メールアドレスまたはSlack Webhook URLを先に設定してください" },
      { status: 400 }
    );
  }

  try {
    await notifyBusiness(
      business,
      `【テスト通知】${business.name}`,
      "これはMEO Syncからのテスト通知です。この通知が届いていれば設定は正常です。"
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
