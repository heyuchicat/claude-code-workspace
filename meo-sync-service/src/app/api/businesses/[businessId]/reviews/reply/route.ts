import { NextResponse } from "next/server";
import { replyToReview } from "@/lib/data-source";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const locationId = body?.locationId as string | undefined;
  const reviewId = body?.reviewId as string | undefined;
  const replyText = (body?.replyText as string | undefined)?.trim();

  if (!locationId || !reviewId || !replyText) {
    return NextResponse.json(
      { error: "locationId・reviewId・replyText は必須です" },
      { status: 400 }
    );
  }

  try {
    await replyToReview(businessId, locationId, reviewId, replyText);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
