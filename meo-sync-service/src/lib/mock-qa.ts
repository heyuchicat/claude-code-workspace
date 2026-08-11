import { QAEntry } from "./types";

// Google Q&A(質問と回答)のダミークライアント(デモモード用)。

const BASE_QUESTIONS: Omit<QAEntry, "answer" | "answeredAt">[] = [
  { id: "mock_q_1", locationId: "gbp_loc_001", question: "駐車場はありますか?" },
  { id: "mock_q_2", locationId: "gbp_loc_001", question: "予約は必要ですか?" },
  { id: "mock_q_3", locationId: "gbp_loc_001", question: "テイクアウトはできますか?" },
];

const globalForMock = globalThis as unknown as {
  __meoMockQaAnswers?: Map<string, { answer: string; answeredAt: string }>;
};

function getAnswers() {
  if (!globalForMock.__meoMockQaAnswers) {
    globalForMock.__meoMockQaAnswers = new Map();
  }
  return globalForMock.__meoMockQaAnswers;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchQuestions(): Promise<QAEntry[]> {
  await delay(150);
  const answers = getAnswers();
  return BASE_QUESTIONS.map((q) => {
    const a = answers.get(q.id);
    return { ...q, answer: a?.answer ?? null, answeredAt: a?.answeredAt ?? null };
  });
}

export async function answerQuestion(questionId: string, answerText: string): Promise<void> {
  await delay(200);
  if (!BASE_QUESTIONS.some((q) => q.id === questionId)) {
    throw new Error(`Unknown question: ${questionId}`);
  }
  getAnswers().set(questionId, { answer: answerText, answeredAt: new Date().toISOString() });
}
