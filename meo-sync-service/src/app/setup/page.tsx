"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../login/login.module.css";

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.setUp) router.replace("/login");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください");
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "セットアップに失敗しました");
      router.push("/businesses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>MEO Sync 初期セットアップ</h1>
        <p className={styles.subtitle}>
          ログイン用の管理者パスワードを設定してください。
          <br />
          このパスワードは今後ログイン時に使用します。
        </p>
        <input
          type="password"
          className={styles.input}
          placeholder="パスワード(8文字以上)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          className={styles.input}
          placeholder="パスワード(確認用)"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "設定中..." : "この内容で始める"}
        </button>
      </form>
    </main>
  );
}
