// Anthropic Messages API への薄いラッパー。AI運用アシスタントの診断コメント生成にのみ使用する。
// ANTHROPIC_API_KEY が未設定の場合は呼び出し元でフォールバック文言を使うこと。

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generateText(prompt: string, maxTokens = 600): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API呼び出しに失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("");
  return text.trim();
}
