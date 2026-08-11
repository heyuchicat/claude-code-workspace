import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";
import { checkAlertsForAllBusinesses } from "@/lib/alerts";

// 外部cron(例: 1時間おき)から呼び出し、低評価クチコミ・順位低下を検知して通知する。
// 例: curl -X POST https://<your-domain>/api/cron/check-alerts \
//       -H "Authorization: Bearer <設定画面のCRON_SECRET>"

export async function POST(request: Request) {
  const settings = await getAdminSettings();
  if (!settings) {
    return NextResponse.json({ error: "初回セットアップが完了していません" }, { status: 428 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${settings.cronSecret}`) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const results = await checkAlertsForAllBusinesses();
  return NextResponse.json({ results });
}
