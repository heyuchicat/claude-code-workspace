import { NextResponse } from "next/server";
import { buildGoogleAuthorizeUrl } from "@/lib/google-business-client";

const STATE_COOKIE = "meo_google_oauth_state";

export async function GET(request: Request) {
  const state = crypto.randomUUID();

  try {
    const url = buildGoogleAuthorizeUrl(state);
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
      new URL(`/?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
