import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { isSetUp } from "@/lib/admin-settings";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/setup",
  "/api/setup",
  "/api/cron/publish-scheduled-posts", // 独自にCRON_SECRETで認証するため対象外にする
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
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
