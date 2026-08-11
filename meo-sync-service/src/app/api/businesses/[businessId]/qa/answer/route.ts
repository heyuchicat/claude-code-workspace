import { NextResponse } from "next/server";
import { answerQuestion } from "@/lib/data-source";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const body = await request.json().catch(() => null);
  const locationId = body?.locationId as string | undefined;
  const questionId = body?.questionId as string | undefined;
  const question = (body?.question as string | undefined) ?? "";
  const answerText = (body?.answerText as string | undefined)?.trim();

  if (!locationId || !questionId || !answerText) {
    return NextResponse.json(
      { error: "locationId・questionId・answerText は必須です" },
      { status: 400 }
    );
  }

  try {
    await answerQuestion(businessId, locationId, questionId, question, answerText);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
