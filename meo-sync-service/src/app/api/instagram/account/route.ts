import { NextResponse } from "next/server";
import { fetchInstagramAccount } from "@/lib/mock-instagram";

export async function GET() {
  const account = await fetchInstagramAccount();
  return NextResponse.json({ account });
}
