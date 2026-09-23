import { NextResponse } from "next/server";
import { getAdminSettings } from "@/lib/admin-settings";

export async function GET() {
  const settings = await getAdminSettings();
  if (!settings) {
    return NextResponse.json({ error: "未セットアップです" }, { status: 428 });
  }
  return NextResponse.json({
    cronSecret: settings.cronSecret,
    createdAt: settings.createdAt,
  });
}
