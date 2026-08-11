import { NextResponse } from "next/server";
import { regenerateCronSecret } from "@/lib/admin-settings";

export async function POST() {
  const cronSecret = await regenerateCronSecret();
  return NextResponse.json({ cronSecret });
}
