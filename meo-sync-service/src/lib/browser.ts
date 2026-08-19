import { chromium, type Browser } from "playwright-core";

// Playwright(Chromium)の起動を一箇所に集約する。
// 通常は `npx playwright install chromium` 済みであれば追加設定は不要。
// 自動検出がうまくいかない特殊な環境(検証環境等)向けに、
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH でChromiumの実行ファイルパスを上書きできる。
export async function launchChromium(): Promise<Browser> {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
}
