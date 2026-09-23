import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/session";
import { isSetUp, verifyPassword } from "@/lib/admin-settings";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = body?.password as string | undefined;

  if (!(await isSetUp())) {
    return NextResponse.json(
      { error: "初回セットアップが完了していません" },
      { status: 428 }
    );
  }

  if (!password || !(await verifyPassword(password))) {
    return NextResponse.json(
      { error: "パスワードが正しくありません" },
      { status: 401 }
    );
  }

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

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
