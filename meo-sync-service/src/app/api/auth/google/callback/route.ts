import { NextRequest, NextResponse } from "next/server";
import { completeGoogleOAuth } from "@/lib/google-business-client";

const STATE_COOKIE = "meo_google_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  const redirectWithError = (message: string) =>
    NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url)
    );

  if (!code) return redirectWithError("Google連携がキャンセルされました");
  if (!state || state !== savedState) {
    return redirectWithError("不正なリクエストです(state不一致)");
  }

  try {
    await completeGoogleOAuth(code);
  } catch (err) {
    return redirectWithError(err instanceof Error ? err.message : String(err));
  }

  const res = NextResponse.redirect(new URL("/?connected=google", request.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
