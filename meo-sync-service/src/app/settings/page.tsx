"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "../businesses/businesses.module.css";

export default function SettingsPage() {
  const [cronSecret, setCronSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copyLabel, setCopyLabel] = useState("コピー");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setCronSecret(data.cronSecret ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleRegenerate() {
    if (!confirm("再生成すると、これまでのcron設定は使えなくなります。よろしいですか?")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/settings/regenerate-cron-secret", { method: "POST" });
      const data = await res.json();
      setCronSecret(data.cronSecret);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(cronSecret);
    setCopyLabel("コピーしました");
    setTimeout(() => setCopyLabel("コピー"), 2000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    setChangingPw(true);
    try {
      const res = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "変更に失敗しました");
      setCurrentPassword("");
      setNewPassword("");
      setPwSuccess(true);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : String(err));
    } finally {
      setChangingPw(false);
    }
  }

  const cronCommand = `curl -X POST <あなたのURL>/api/cron/publish-scheduled-posts \\\n  -H "Authorization: Bearer ${cronSecret}"`;

  return (
    <main className={styles.main}>
      <div className={styles.headerRow}>
        <div>
          <Link href="/businesses" className={styles.subtitle}>
            ← 店舗一覧
          </Link>
          <h1>設定</h1>
        </div>
      </div>

      <section className={styles.businessCard} style={{ flexDirection: "column", alignItems: "stretch", padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>予約投稿の自動公開(cron)</h2>
        <p className={styles.businessMeta} style={{ marginBottom: 12 }}>
          予約投稿を自動で公開するには、下記コマンドを外部のcron(タスクスケジューラ等)で
          定期実行してください。
        </p>
        {loading ? (
          <p className={styles.subtitle}>読み込み中...</p>
        ) : (
          <>
            <pre
              style={{
                background: "rgba(128,128,128,0.1)",
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {cronCommand}
            </pre>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button className={styles.primaryButton} onClick={handleCopy} type="button">
                {copyLabel}
              </button>
              <button
                className={styles.deleteButton}
                onClick={handleRegenerate}
                disabled={regenerating}
                type="button"
              >
                {regenerating ? "再生成中..." : "秘密鍵を再生成"}
              </button>
            </div>
          </>
        )}
      </section>

      <form
        className={styles.businessCard}
        style={{ flexDirection: "column", alignItems: "stretch", padding: 20, gap: 10 }}
        onSubmit={handleChangePassword}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>管理者パスワードの変更</h2>
        <input
          className={styles.input}
          type="password"
          placeholder="現在のパスワード"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="新しいパスワード(8文字以上)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        {pwError && <p style={{ color: "#dc2626", fontSize: 13 }}>{pwError}</p>}
        {pwSuccess && <p style={{ color: "#16a34a", fontSize: 13 }}>変更しました</p>}
        <button className={styles.primaryButton} disabled={changingPw}>
          {changingPw ? "変更中..." : "パスワードを変更"}
        </button>
      </form>
    </main>
  );
}
