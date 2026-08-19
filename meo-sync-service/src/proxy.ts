import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { isSetUp } from "@/lib/admin-settings";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/setup",
  "/api/setup",
  // 以下は独自にCRON_SECRETで認証するため対象外にする
  "/api/cron/publish-scheduled-posts",
  "/api/cron/send-monthly-reports",
  "/api/cron/check-alerts",
  "/api/cron/check-tracked-keywords",
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // アップロード画像はGoogle側のサーバーが投稿時にログインなしで取得できる必要があるため公開する。
  // ファイル名はUUIDのため第三者が推測してアクセスすることは実質不可能。
  if (pathname.startsWith("/uploads/")) {
    return NextResponse.next();
  }

  const setUp = await isSetUp();
  if (!setUp) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "初回セットアップが未完了です" }, { status: 428 });
    }
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
