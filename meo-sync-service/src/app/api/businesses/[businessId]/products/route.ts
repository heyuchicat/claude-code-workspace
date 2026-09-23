import { NextResponse } from "next/server";
import { createProduct, fetchProducts } from "@/lib/data-source";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const locationId = new URL(request.url).searchParams.get("locationId");
  if (!locationId) {
    return NextResponse.json({ error: "locationId は必須です" }, { status: 400 });
  }
  const products = await fetchProducts(businessId, locationId);
  return NextResponse.json({ products });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const locationId = body?.locationId as string | undefined;
  const category = (body?.category as string | undefined)?.trim();
  const name = (body?.name as string | undefined)?.trim();
  const description = (body?.description as string | undefined)?.trim() ?? "";
  const photoUrl = (body?.photoUrl as string | undefined)?.trim();
  const priceYenRaw = body?.priceYen;

  if (!locationId || !category || !name || !photoUrl) {
    return NextResponse.json(
      { error: "locationId・category・name・photoUrl は必須です" },
      { status: 400 }
    );
  }

  const priceYen =
    priceYenRaw === "" || priceYenRaw === undefined || priceYenRaw === null
      ? null
      : Number(priceYenRaw);
  if (priceYen !== null && (!Number.isFinite(priceYen) || priceYen < 0)) {
    return NextResponse.json({ error: "priceYen は0以上の数値で指定してください" }, { status: 400 });
  }

  try {
    const product = await createProduct(businessId, {
      locationId,
      category,
      name,
      description,
      priceYen,
      photoUrl,
    });
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
