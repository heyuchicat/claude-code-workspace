import { NextRequest, NextResponse } from "next/server";
import { completeInstagramOAuth } from "@/lib/instagram-client";

const STATE_COOKIE = "meo_ig_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  // stateは "<businessId>.<nonce>" の形式
  const businessId = state?.split(".")[0];

  const redirectWithError = (message: string) =>
    NextResponse.redirect(
      new URL(
        `${businessId ? `/businesses/${businessId}` : "/businesses"}?error=${encodeURIComponent(message)}`,
        request.url
      )
    );

  if (!code) return redirectWithError("Instagram連携がキャンセルされました");
  if (!state || !businessId || state !== savedState) {
    return redirectWithError("不正なリクエストです(state不一致)");
  }

  try {
    await completeInstagramOAuth(businessId, code);
  } catch (err) {
    return redirectWithError(err instanceof Error ? err.message : String(err));
  }

  const res = NextResponse.redirect(
    new URL(`/businesses/${businessId}?connected=instagram`, request.url)
  );
  res.cookies.delete(STATE_COOKIE);
  return res;
}
