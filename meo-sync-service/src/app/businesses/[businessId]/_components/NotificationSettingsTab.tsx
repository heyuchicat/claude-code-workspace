"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";

export default function NotificationSettingsTab({ businessId }: { businessId: string }) {
  const [alertEmail, setAlertEmail] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}`);
    const data = await res.json();
    setAlertEmail(data.business?.alertEmail ?? "");
    setSlackWebhookUrl(data.business?.slackWebhookUrl ?? "");
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertEmail, slackWebhookUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setNotice("保存しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/test-notification`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送信に失敗しました");
      setNotice("テスト通知を送信しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <p className={styles.loading}>読み込み中...</p>;

  return (
    <form className={styles.scheduleForm} onSubmit={handleSave}>
      <h2 className={styles.sectionTitle}>アラート通知の設定</h2>
      <p className={styles.postMeta}>
        低評価クチコミ(評価2以下)が投稿された時、検索順位が大きく下がった時に通知します。
        外部cronから <code>/api/cron/check-alerts</code> を定期実行(例: 1時間おき)している場合に動作します。
      </p>

      <label className={styles.postMeta}>通知先メールアドレス</label>
      <input
        className={styles.input}
        type="email"
        placeholder="例: owner@example.com(未設定なら通知しない)"
        value={alertEmail}
        onChange={(e) => setAlertEmail(e.target.value)}
      />

      <label className={styles.postMeta}>Slack Incoming Webhook URL</label>
      <input
        className={styles.input}
        placeholder="https://hooks.slack.com/services/...(未設定なら通知しない)"
        value={slackWebhookUrl}
        onChange={(e) => setSlackWebhookUrl(e.target.value)}
      />

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className={styles.primaryButton} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? "送信中..." : "テスト通知を送信"}
        </button>
      </div>
    </form>
  );
}
