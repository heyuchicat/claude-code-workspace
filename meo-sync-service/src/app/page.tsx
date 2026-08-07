"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";
import {
  GoogleBusinessLocation,
  GoogleBusinessPost,
  InstagramAccount,
  InstagramPost,
  LinkMapping,
} from "@/lib/types";

type PostWithLink = InstagramPost & { link: LinkMapping | null };

export default function Home() {
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [posts, setPosts] = useState<PostWithLink[]>([]);
  const [googlePosts, setGooglePosts] = useState<GoogleBusinessPost[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [accountRes, locationsRes, postsRes, googlePostsRes] =
      await Promise.all([
        fetch("/api/instagram/account").then((r) => r.json()),
        fetch("/api/google/locations").then((r) => r.json()),
        fetch("/api/instagram/posts").then((r) => r.json()),
        fetch("/api/google/posts").then((r) => r.json()),
      ]);

    setAccount(accountRes.account);
    setLocations(locationsRes.locations);
    setPosts(postsRes.posts);
    setGooglePosts(googlePostsRes.posts);
    setLocationId((prev) => prev || locationsRes.locations[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    // 初回マウント時のみ取得するダッシュボードのため許容
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  async function handleSync(postId: string) {
    if (!locationId) return;
    setSyncingId(postId);
    setError(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramPostId: postId, locationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "同期に失敗しました");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingId(null);
    }
  }

  async function handleSyncAll() {
    if (!locationId) return;
    setSyncingAll(true);
    setError(null);
    try {
      const res = await fetch("/api/sync/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "一括同期に失敗しました");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingAll(false);
    }
  }

  const linkedCount = posts.filter((p) => p.link).length;
  const unlinkedCount = posts.length - linkedCount;

  if (loading) {
    return (
      <main className={styles.main}>
        <p className={styles.loading}>読み込み中...</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>MEO Sync</h1>
        <p className={styles.subtitle}>
          Instagram投稿をGoogleビジネスプロフィールへ自動連携するMEOツール(MVPプロトタイプ)
        </p>
      </header>

      <section className={styles.accountsRow}>
        <div className={styles.accountCard}>
          <span className={styles.accountLabel}>Instagram</span>
          <span className={styles.accountName}>
            @{account?.username ?? "-"}
          </span>
          <span className={styles.badgeConnected}>連携済み</span>
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.accountCard}>
          <span className={styles.accountLabel}>Google ビジネスプロフィール</span>
          <span className={styles.accountName}>
            {locations.find((l) => l.id === locationId)?.name ?? "-"}
          </span>
          <span className={styles.badgeConnected}>連携済み</span>
        </div>
      </section>

      <section className={styles.controls}>
        <label className={styles.locationSelect}>
          投稿先ロケーション:
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className={styles.primaryButton}
          onClick={handleSyncAll}
          disabled={syncingAll || unlinkedCount === 0}
        >
          {syncingAll
            ? "同期中..."
            : `未連携の投稿をすべて同期 (${unlinkedCount}件)`}
        </button>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{posts.length}</span>
          <span className={styles.statLabel}>Instagram投稿数</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{linkedCount}</span>
          <span className={styles.statLabel}>連携済み</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{unlinkedCount}</span>
          <span className={styles.statLabel}>未連携</span>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Instagram投稿</h2>
        <div className={styles.postGrid}>
          {posts.map((post) => (
            <article key={post.id} className={styles.postCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.mediaUrl}
                alt={post.caption}
                className={styles.postImage}
              />
              <div className={styles.postBody}>
                <p className={styles.postCaption}>{post.caption}</p>
                <p className={styles.postMeta}>
                  {new Date(post.timestamp).toLocaleDateString("ja-JP")} ・
                  ♥ {post.likeCount} ・ 💬 {post.commentCount}
                </p>
                {post.link ? (
                  <span className={styles.badgeLinked}>
                    Googleへ連携済み ({new Date(post.link.linkedAt).toLocaleDateString("ja-JP")})
                  </span>
                ) : (
                  <button
                    className={styles.secondaryButton}
                    onClick={() => handleSync(post.id)}
                    disabled={syncingId === post.id || !locationId}
                  >
                    {syncingId === post.id ? "同期中..." : "Googleに投稿"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>
          Googleビジネスプロフィール 投稿 ({googlePosts.length})
        </h2>
        <div className={styles.googlePostList}>
          {googlePosts.length === 0 && (
            <p className={styles.emptyState}>まだ連携された投稿はありません。</p>
          )}
          {googlePosts.map((gp) => (
            <div key={gp.id} className={styles.googlePostRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gp.mediaUrl}
                alt={gp.summary}
                className={styles.googlePostThumb}
              />
              <div>
                <p className={styles.postCaption}>{gp.summary}</p>
                <p className={styles.postMeta}>
                  {new Date(gp.createdAt).toLocaleString("ja-JP")} ・ステータス:{" "}
                  {gp.status} ・元投稿: {gp.sourceInstagramPostId}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
