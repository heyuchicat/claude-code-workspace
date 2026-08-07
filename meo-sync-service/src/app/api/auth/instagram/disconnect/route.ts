import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/connections";

export async function POST() {
  await deleteConnection("instagram");
  return NextResponse.json({ ok: true });
}
