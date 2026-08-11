import { NextResponse } from "next/server";
import { createGoogleBusinessPost } from "@/lib/data-source";
import { listDuePosts, markFailed, markPublished } from "@/lib/scheduled-posts-store";

// 外部のcron(Vercel Cron, システムcron等)から定期的に呼び出すエンドポイント。
// 管理者ログインセッションを持たないため、CRON_SECRETによる認証で保護する。
// 例: curl -X POST https://<your-domain>/api/cron/publish-scheduled-posts \
//       -H "Authorization: Bearer $CRON_SECRET"

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET が設定されていません" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
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
