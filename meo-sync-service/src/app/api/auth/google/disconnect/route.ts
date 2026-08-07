import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/connections";

export async function POST() {
  await deleteConnection("google");
  return NextResponse.json({ ok: true });
}
