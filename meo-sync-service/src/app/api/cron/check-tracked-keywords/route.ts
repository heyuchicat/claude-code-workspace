import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";
import { checkAllTrackedKeywordRanks } from "@/lib/scheduled-jobs";

// このエンドポイントは、アプリ起動中は自動的に内蔵スケジューラ(1日1回)から
// 呼ばれるため、通常は外部cronの設定は不要です。手動実行・動作確認用に残しています。
// キーワード数が多いと完了まで時間がかかる点に注意(rank-checker.ts側で
// 同時実行1件・間隔15秒以上を強制)。
// 例: curl -X POST https://<your-domain>/api/cron/check-tracked-keywords \
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

  const results = await checkAllTrackedKeywordRanks();
  return NextResponse.json({ processed: results.length, results });
}
