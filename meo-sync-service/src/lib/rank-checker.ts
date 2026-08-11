import { chromium } from "playwright-core";

// 【実験的機能・要注意】
// Googleマップの検索結果ページをヘッドレスブラウザで開き、掲載順位を目視同様の方法で
// 読み取る機能。Googleは検索結果ページの自動取得(スクレイピング)を利用規約で
// 禁止しており、本機能の利用はその規約に抵触する可能性がある。
// アクセス過多はアカウント停止・IPブロックのリスクがあるため、以下を厳守する:
//   - 同時実行を1件に制限する(runWithLock)
//   - 呼び出し間に最低間隔を空ける(MIN_INTERVAL_MS)
//   - CAPTCHA等の検知を回避する仕組み(UA偽装・プロキシローテーション等)は実装しない。
//     ブロックされた場合はエラーを返すのみとする。
// 本番導入前に、この機能を使うかどうかを含め自己責任で判断すること。

const MIN_INTERVAL_MS = 15_000;
let lastRunAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRunAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRunAt = Date.now();
    return fn();
  });
  // 後続の待ち行列を継続させるため、エラーは握りつぶしたコピーをqueueに積む
  queue = run.catch(() => undefined);
  return run;
}

export class RankCheckBlockedError extends Error {
  constructor(detail: string) {
    super(
      `Googleにブロックされた可能性があります(CAPTCHA/確認画面が表示されました): ${detail}`
    );
    this.name = "RankCheckBlockedError";
  }
}

async function checkRankOnce(
  keyword: string,
  businessNameMatch: string
): Promise<number | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    page.setDefaultTimeout(20_000);

    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(keyword)}`, {
      waitUntil: "domcontentloaded",
    });

    // Cookie同意画面が出た場合は可能な範囲でクリックする(ブロック回避目的ではなく、
    // 通常の閲覧を妨げるダイアログを閉じるだけの一般的な操作)。
    const consentButton = page.getByRole("button", { name: /同意する|Accept all|すべて同意/ });
    if (await consentButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await consentButton.first().click().catch(() => undefined);
    }

    const feed = page.locator('div[role="feed"]');
    const found = await feed.first().waitFor({ timeout: 15_000 }).then(
      () => true,
      () => false
    );

    if (!found) {
      const bodyText = await page.textContent("body").catch(() => "");
      if (bodyText && /unusual traffic|automated queries|captcha/i.test(bodyText)) {
        throw new RankCheckBlockedError("Google側の異常トラフィック検知ページ");
      }
      // 検索結果が1件のみでフィード表示がされないケース(単独ヒット)
      const singleResultTitle = await page
        .locator("h1")
        .first()
        .textContent()
        .catch(() => null);
      if (singleResultTitle && normalize(singleResultTitle).includes(normalize(businessNameMatch))) {
        return 1;
      }
      return null;
    }

    const names = await feed
      .locator("a[aria-label]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));

    const target = normalize(businessNameMatch);
    const index = names.findIndex((name) => normalize(name).includes(target));
    return index === -1 ? null : index + 1;
  } finally {
    await browser.close();
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export async function checkRank(
  keyword: string,
  businessNameMatch: string
): Promise<number | null> {
  return runSerialized(() => checkRankOnce(keyword, businessNameMatch));
}
