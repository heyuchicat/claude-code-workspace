import { NextResponse } from "next/server";
import { createBusiness, listBusinesses } from "@/lib/businesses";

export async function GET() {
  return NextResponse.json({ businesses: await listBusinesses() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = (body?.name as string | undefined)?.trim();
  if (!name) {
    return NextResponse.json({ error: "店舗名を入力してください" }, { status: 400 });
  }
  const business = await createBusiness(name);
  return NextResponse.json({ business });
}
