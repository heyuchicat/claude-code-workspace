import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";
import { listAllTrackedKeywords } from "@/lib/tracked-keywords-store";
import { checkRank, RankCheckBlockedError } from "@/lib/rank-checker";
import { recordRankCheck } from "@/lib/rank-checks-store";

// 外部cron(例: 1日1回)から呼び出し、登録済みキーワードすべての順位を
// 順番にチェックする(rank-checker.ts側で同時実行1件・間隔15秒以上を強制)。
// キーワード数が多いと完了まで時間がかかる点に注意。
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

  const keywords = await listAllTrackedKeywords();
  const results: { id: string; ok: boolean; rank?: number | null; error?: string }[] = [];

  for (const k of keywords) {
    try {
      const rank = await checkRank(k.keyword, k.businessNameMatch);
      await recordRankCheck(k.businessId, k.locationId, k.keyword, rank);
      results.push({ id: k.id, ok: true, rank });
    } catch (err) {
      const message =
        err instanceof RankCheckBlockedError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      results.push({ id: k.id, ok: false, error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
