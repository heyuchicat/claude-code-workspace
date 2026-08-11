import { NextResponse } from "next/server";
import { changePassword, verifyPassword } from "@/lib/admin-settings";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword as string | undefined;
  const newPassword = body?.newPassword as string | undefined;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "currentPassword・newPassword は必須です" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "新しいパスワードは8文字以上で設定してください" },
      { status: 400 }
    );
  }
  if (!(await verifyPassword(currentPassword))) {
    return NextResponse.json(
      { error: "現在のパスワードが正しくありません" },
      { status: 401 }
    );
  }

  await changePassword(newPassword);
  return NextResponse.json({ ok: true });
}
