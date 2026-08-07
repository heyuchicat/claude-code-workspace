import { NextResponse } from "next/server";
import { getConnectionStatus } from "@/lib/data-source";

export async function GET() {
  return NextResponse.json(await getConnectionStatus());
}
