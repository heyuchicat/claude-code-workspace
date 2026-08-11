"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./businesses.module.css";
import type { Business } from "@/lib/businesses";

export default function BusinessesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/businesses");
    const data = await res.json();
    setBusinesses(data.businesses);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "作成に失敗しました");
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この店舗を削除しますか?連携情報・投稿履歴もすべて削除されます。")) return;
    await fetch(`/api/businesses/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>読み込み中...</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.headerRow}>
        <div>
          <h1>MEO Sync</h1>
          <p className={styles.subtitle}>管理する店舗を選択してください</p>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          ログアウト
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.businessGrid}>
        {businesses.map((b) => (
          <div key={b.id} className={styles.businessCard}>
            <Link href={`/businesses/${b.id}`} className={styles.businessLink}>
              <span className={styles.businessName}>{b.name}</span>
              <span className={styles.businessMeta}>
                登録日: {new Date(b.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </Link>
            <button
              className={styles.deleteButton}
              onClick={() => handleDelete(b.id)}
            >
              削除
            </button>
          </div>
        ))}
      </div>

      <form className={styles.createForm} onSubmit={handleCreate}>
        <input
          className={styles.input}
          placeholder="新しい店舗名(例: 渋谷店)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className={styles.primaryButton} disabled={creating}>
          {creating ? "作成中..." : "店舗を追加"}
        </button>
      </form>
    </main>
  );
}
