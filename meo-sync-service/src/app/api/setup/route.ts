import { NextResponse } from "next/server";
import { createAdminSettings, isSetUp } from "@/lib/admin-settings";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/session";

export async function GET() {
  return NextResponse.json({ setUp: await isSetUp() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で設定してください" },
      { status: 400 }
    );
  }

  if (await isSetUp()) {
    return NextResponse.json(
      { error: "すでにセットアップ済みです" },
      { status: 409 }
    );
  }

  await createAdminSettings(password);

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
