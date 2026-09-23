import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";
import { sendDueMonthlyReports } from "@/lib/scheduled-jobs";

// このエンドポイントは、アプリ起動中は自動的に内蔵スケジューラ(1日1回チェックし、
// 前回送付から30日以上経過している店舗にのみ送付)から呼ばれるため、
// 通常は外部cronの設定は不要です。手動実行・動作確認用に残しています。
// 例: curl -X POST https://<your-domain>/api/cron/send-monthly-reports \
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

  const results = await sendDueMonthlyReports();
  return NextResponse.json({ processed: results.length, results });
}
