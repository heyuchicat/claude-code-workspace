import { NextResponse } from "next/server";
import { buildGoogleAdsAuthorizeUrl } from "@/lib/google-ads-client";

const STATE_COOKIE = "meo_google_ads_oauth_state";

export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId は必須です" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  const state = `${businessId}.${nonce}`;

  try {
    const url = buildGoogleAdsAuthorizeUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      new URL(`/businesses/${businessId}?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
