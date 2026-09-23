// アプリ起動中、外部のタスクスケジューラ・cron設定なしで自動的に
// 予約投稿の公開・順位チェック・アラート通知・月次レポート送付を行うための
// 内蔵スケジューラ。Next.jsのinstrumentation機能で、サーバー起動時に一度だけ実行される。
// 参考: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
//
// 注意: これはアプリ(Node.jsプロセス)が起動している間だけ動作する。
// PCを閉じてアプリが停止している間は当然実行されない。

const PUBLISH_INTERVAL_MS = 5 * 60 * 1000; // 5分おき
const ALERTS_INTERVAL_MS = 60 * 60 * 1000; // 1時間おき
const RANK_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1日おき
const MONTHLY_REPORT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1日おき(送付要否は内部で判定)

type SchedulerState = { started?: boolean };
const globalState = globalThis as unknown as { __meoScheduler?: SchedulerState };

function runRepeatedly(
  label: string,
  fn: () => Promise<unknown>,
  intervalMs: number,
  initialDelayMs: number
) {
  const run = async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[scheduler:${label}] failed:`, err);
    }
  };
  setTimeout(() => {
    run();
    setInterval(run, intervalMs);
  }, initialDelayMs);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (globalState.__meoScheduler?.started) return; // 開発時のホットリロードで二重登録しない
  globalState.__meoScheduler = { started: true };

  const { isSetUp } = await import("./lib/admin-settings");
  const {
    publishDueScheduledPosts,
    checkAllAlerts,
    checkAllTrackedKeywordRanks,
    sendDueMonthlyReports,
  } = await import("./lib/scheduled-jobs");

  const runIfSetUp = (fn: () => Promise<unknown>) => async () => {
    if (!(await isSetUp())) return; // 初回セットアップ未完了の間は何もしない
    await fn();
  };

  runRepeatedly("publish-scheduled-posts", runIfSetUp(publishDueScheduledPosts), PUBLISH_INTERVAL_MS, 5_000);
  runRepeatedly("check-alerts", runIfSetUp(checkAllAlerts), ALERTS_INTERVAL_MS, 15_000);
  runRepeatedly("check-tracked-keywords", runIfSetUp(checkAllTrackedKeywordRanks), RANK_CHECK_INTERVAL_MS, 30_000);
  runRepeatedly("send-monthly-reports", runIfSetUp(sendDueMonthlyReports), MONTHLY_REPORT_INTERVAL_MS, 60_000);

  console.log("[scheduler] 内蔵スケジューラを起動しました(予約投稿・順位チェック・アラート・月次レポート)");
}
