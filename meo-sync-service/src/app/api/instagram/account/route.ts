import { NextResponse } from "next/server";
import { fetchInstagramAccount } from "@/lib/data-source";

export async function GET() {
  const account = await fetchInstagramAccount();
  return NextResponse.json({ account });
}
