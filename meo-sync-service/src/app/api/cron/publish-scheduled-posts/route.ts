import { NextResponse } from "next/server";
import { createGoogleBusinessPost } from "@/lib/data-source";
import { listDuePosts, markFailed, markPublished } from "@/lib/scheduled-posts-store";
import { getAdminSettings } from "@/lib/admin-settings";

// 外部のcron(Vercel Cron, システムcron等)から定期的に呼び出すエンドポイント。
// 管理者ログインセッションを持たないため、CRON_SECRET(設定画面で確認可能)による
// 認証で保護する。
// 例: curl -X POST https://<your-domain>/api/cron/publish-scheduled-posts \
//       -H "Authorization: Bearer <設定画面のCRON_SECRET>"

export async function POST(request: Request) {
  const settings = await getAdminSettings();
  if (!settings) {
    return NextResponse.json(
      { error: "初回セットアップが完了していません" },
      { status: 428 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${settings.cronSecret}`) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const duePosts = await listDuePosts();
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const post of duePosts) {
    try {
      await createGoogleBusinessPost(post.businessId, {
        locationId: post.locationId,
        summary: post.summary,
        mediaUrl: post.mediaUrl,
        sourceInstagramPostId: "",
      });
      await markPublished(post.id);
      results.push({ id: post.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markFailed(post.id, message);
      results.push({ id: post.id, ok: false, error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
