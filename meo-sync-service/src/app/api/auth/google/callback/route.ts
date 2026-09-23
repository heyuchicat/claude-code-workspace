import { NextRequest, NextResponse } from "next/server";
import { completeGoogleOAuth } from "@/lib/google-business-client";

const STATE_COOKIE = "meo_google_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  const businessId = state?.split(".")[0];

  const redirectWithError = (message: string) =>
    NextResponse.redirect(
      new URL(
        `${businessId ? `/businesses/${businessId}` : "/businesses"}?error=${encodeURIComponent(message)}`,
        request.url
      )
    );

  if (!code) return redirectWithError("Google連携がキャンセルされました");
  if (!state || !businessId || state !== savedState) {
    return redirectWithError("不正なリクエストです(state不一致)");
  }

  let result;
  try {
    result = await completeGoogleOAuth(businessId, code);
  } catch (err) {
    return redirectWithError(err instanceof Error ? err.message : String(err));
  }

  const targetUrl =
    result.status === "needs_selection"
      ? `/businesses/${businessId}/select-google-account?pendingId=${result.pendingId}`
      : `/businesses/${businessId}?connected=google`;

  const res = NextResponse.redirect(new URL(targetUrl, request.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}
