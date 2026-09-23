"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";

type ExternalListing = {
  id: string;
  platform: string;
  url: string;
};

const PLATFORM_SUGGESTIONS = ["食べログ", "ホットペッパー", "Retty", "エキテン", "Yahoo!プレイス"];

export default function ExternalListingsTab({ businessId }: { businessId: string }) {
  const [listings, setListings] = useState<ExternalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/businesses/${businessId}/external-listings`);
    const data = await res.json();
    setListings(data.listings ?? []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/external-listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");
      setPlatform("");
      setUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(id: string) {
    await fetch(`/api/businesses/${businessId}/external-listings/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <p className={styles.demoBadge}>
        食べログ・ホットペッパー等、他プラットフォームの掲載ページへのリンクをまとめて管理できます。
        <br />
        公開APIが存在しないため自動連携はできません。各サイトのプロフィールURLを手動で登録してください。
      </p>

      <form className={styles.scheduleForm} onSubmit={handleCreate}>
        <h2 className={styles.sectionTitle}>掲載サイトを追加</h2>
        <input
          className={styles.input}
          list="platform-suggestions"
          placeholder="サイト名(例: 食べログ)"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          required
        />
        <datalist id="platform-suggestions">
          {PLATFORM_SUGGESTIONS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <input
          className={styles.input}
          placeholder="掲載ページURL(https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.primaryButton} disabled={creating}>
          {creating ? "登録中..." : "登録する"}
        </button>
      </form>

      <section>
        <h2 className={styles.sectionTitle}>登録済みの掲載サイト</h2>
        {loading ? (
          <p className={styles.loading}>読み込み中...</p>
        ) : (
          <div className={styles.rankList}>
            {listings.length === 0 && (
              <p className={styles.emptyState}>まだ登録された掲載サイトはありません。</p>
            )}
            {listings.map((l) => (
              <div key={l.id} className={styles.rankRow}>
                <span className={styles.postCaption}>
                  <strong>{l.platform}</strong>
                </span>
                <a href={l.url} target="_blank" rel="noreferrer" className={styles.postMeta}>
                  {l.url}
                </a>
                <button className={styles.linkButton} onClick={() => handleRemove(l.id)}>
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
