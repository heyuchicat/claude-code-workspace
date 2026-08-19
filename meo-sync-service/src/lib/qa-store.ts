import { prisma } from "./db";

// Q&A回答操作の監査ログ。現在の質問一覧はGoogle API(またはmock)側が
// 真実の情報源であり、ここは回答履歴のログとして保持するのみ。
export async function logQaAnswer(
  businessId: string,
  locationId: string,
  externalQuestionId: string,
  question: string,
  answerText: string
): Promise<void> {
  const existing = await prisma.qAEntry.findFirst({
    where: { businessId, externalQuestionId },
  });
  if (existing) {
    await prisma.qAEntry.update({
      where: { id: existing.id },
      data: { answer: answerText, answeredAt: new Date() },
    });
  } else {
    await prisma.qAEntry.create({
      data: {
        businessId,
        locationId,
        externalQuestionId,
        question,
        answer: answerText,
        answeredAt: new Date(),
      },
    });
  }
}
