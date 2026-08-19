"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import {
  GoogleBusinessLocation,
  GoogleBusinessPost,
  InstagramAccount,
  InstagramPost,
  LinkMapping,
} from "@/lib/types";

type PostWithLink = InstagramPost & { link: LinkMapping | null };

type ConnectionStatus = {
  instagram: { connected: true; label: string } | { connected: false };
  google: { connected: true; label: string } | { connected: false };
};

export default function SyncTab({ businessId }: { businessId: string }) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [posts, setPosts] = useState<PostWithLink[]>([]);
  const [googlePosts, setGooglePosts] = useState<GoogleBusinessPost[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const base = `/api/businesses/${businessId}`;
    const [statusRes, accountRes, locationsRes, postsRes, googlePostsRes] =
      await Promise.all([
        fetch(`${base}/auth/status`).then((r) => r.json()),
        fetch(`${base}/instagram/account`).then((r) => r.json()),
        fetch(`${base}/google/locations`).then((r) => r.json()),
        fetch(`${base}/instagram/posts`).then((r) => r.json()),
        fetch(`${base}/google/posts`).then((r) => r.json()),
      ]);

    setStatus(statusRes);
    setAccount(accountRes.account);
    setLocations(locationsRes.locations);
    setPosts(postsRes.posts);
    setGooglePosts(googlePostsRes.posts);
    setLocationId((prev) => prev || locationsRes.locations[0]?.id || "");
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  async function handleSync(postId: string) {
    if (!locationId) return;
    setSyncingId(postId);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/sync`, {
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
      const res = await fetch(`/api/businesses/${businessId}/sync/all`, {
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

  async function handleDisconnect(provider: "instagram" | "google") {
    setDisconnecting(provider);
    try {
      await fetch(`/api/businesses/${businessId}/auth/${provider}/disconnect`, {
        method: "POST",
      });
      await loadAll();
    } finally {
      setDisconnecting(null);
    }
  }

  const linkedCount = posts.filter((p) => p.link).length;
  const unlinkedCount = posts.length - linkedCount;
  const isDemoMode = !status?.instagram.connected || !status?.google.connected;

  if (loading) {
    return <p className={styles.loading}>読み込み中...</p>;
  }

  return (
    <div>
      {isDemoMode && (
        <p className={styles.demoBadge}>
          デモモード:
          未接続のサービスはダミーデータを表示しています。下の「連携する」ボタンから実際のアカウントに接続できます。
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.accountsRow}>
        <div className={styles.accountCard}>
          <span className={styles.accountLabel}>Instagram</span>
          <span className={styles.accountName}>
            @{account?.username ?? "-"}
          </span>
          {status?.instagram.connected ? (
            <div className={styles.connectionActions}>
              <span className={styles.badgeConnected}>連携済み</span>
              <button
                className={styles.linkButton}
                onClick={() => handleDisconnect("instagram")}
                disabled={disconnecting === "instagram"}
              >
                連携を解除
              </button>
            </div>
          ) : (
            <a
              className={styles.connectButton}
              href={`/api/auth/instagram/start?businessId=${businessId}`}
            >
              Instagramを連携する
            </a>
          )}
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.accountCard}>
          <span className={styles.accountLabel}>Google ビジネスプロフィール</span>
          <span className={styles.accountName}>
            {locations.find((l) => l.id === locationId)?.name ?? "-"}
          </span>
          {status?.google.connected ? (
            <div className={styles.connectionActions}>
              <span className={styles.badgeConnected}>連携済み</span>
              <button
                className={styles.linkButton}
                onClick={() => handleDisconnect("google")}
                disabled={disconnecting === "google"}
              >
                連携を解除
              </button>
            </div>
          ) : (
            <a
              className={styles.connectButton}
              href={`/api/auth/google/start?businessId=${businessId}`}
            >
              Googleを連携する
            </a>
          )}
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
    </div>
  );
}
