import { QAEntry } from "./types";
import { getValidGoogleAccessToken } from "./google-business-client";

// Google Q&A(質問と回答)の実APIクライアント。
// 参考: https://developers.google.com/my-business/reference/rest/v4/locations.questions
// 注意: legacy mybusiness v4 の一部。実装時点の公式ドキュメントで再確認してください。

const LEGACY_MYBUSINESS_BASE = "https://mybusiness.googleapis.com/v4";

type ApiQuestion = {
  name: string; // "locations/{locationId}/questions/{questionId}"
  text?: string;
  topAnswers?: { text: string; createTime: string }[];
};

function toQAEntry(raw: ApiQuestion, locationId: string): QAEntry {
  const topAnswer = raw.topAnswers?.[0];
  return {
    id: raw.name,
    locationId,
    question: raw.text ?? "",
    answer: topAnswer?.text ?? null,
    answeredAt: topAnswer?.createTime ?? null,
  };
}

export async function fetchRealQuestions(
  businessId: string,
  locationId: string
): Promise<QAEntry[]> {
  const { accessToken } = await getValidGoogleAccessToken(businessId);

  const res = await fetch(
    `${LEGACY_MYBUSINESS_BASE}/${locationId}/questions`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    throw new Error(`Q&A取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return ((data.questions ?? []) as ApiQuestion[]).map((q) => toQAEntry(q, locationId));
}

export async function answerRealQuestion(
  businessId: string,
  questionResourceName: string,
  answerText: string
): Promise<void> {
  const { accessToken } = await getValidGoogleAccessToken(businessId);

  const res = await fetch(`${LEGACY_MYBUSINESS_BASE}/${questionResourceName}/answers:createAnswer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answer: { text: answerText } }),
  });
  if (!res.ok) {
    throw new Error(`Q&Aへの回答に失敗しました: ${await res.text()}`);
  }
}
