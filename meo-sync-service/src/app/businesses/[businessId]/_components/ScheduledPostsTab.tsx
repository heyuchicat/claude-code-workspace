"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation, ScheduledPost } from "@/lib/types";

const STATUS_LABEL: Record<ScheduledPost["status"], string> = {
  PENDING: "予約中",
  PUBLISHED: "公開済み",
  FAILED: "失敗",
};

export default function ScheduledPostsTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [locationId, setLocationId] = useState("");
  const [summary, setSummary] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [locationsRes, postsRes] = await Promise.all([
      fetch(`/api/businesses/${businessId}/google/locations`).then((r) => r.json()),
      fetch(`/api/businesses/${businessId}/scheduled-posts`).then((r) => r.json()),
    ]);
    setLocations(locationsRes.locations);
    setLocationId((prev) => prev || locationsRes.locations[0]?.id || "");
    setPosts(postsRes.posts);
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
      const res = await fetch(`/api/businesses/${businessId}/scheduled-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, summary, mediaUrl, scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "予約投稿の作成に失敗しました");
      setSummary("");
      setMediaUrl("");
      setScheduledAt("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/businesses/${businessId}/uploads`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      setMediaUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleCancel(id: string) {
    await fetch(`/api/businesses/${businessId}/scheduled-posts/${id}`, {
      method: "DELETE",
    });
    await load();
  }

  return (
    <div>
      <form className={styles.scheduleForm} onSubmit={handleCreate}>
        <h2 className={styles.sectionTitle}>予約投稿を作成</h2>
        <label className={styles.locationSelect}>
          投稿先ロケーション:
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        <textarea
          className={styles.textarea}
          placeholder="投稿内容"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
        />
        <input
          className={styles.input}
          placeholder="画像URL(https://... または下からアップロード)"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          required
        />
        <label className={styles.secondaryButton} style={{ display: "inline-block", cursor: "pointer" }}>
          {uploading ? "アップロード中..." : "画像をアップロード"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
        {uploadError && <p className={styles.error}>{uploadError}</p>}
        {mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="プレビュー" className={styles.googlePostThumb} />
        )}
        <input
          className={styles.input}
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.primaryButton} disabled={creating}>
          {creating ? "作成中..." : "予約する"}
        </button>
      </form>

      <section>
        <h2 className={styles.sectionTitle}>予約投稿一覧</h2>
        {loading ? (
          <p className={styles.loading}>読み込み中...</p>
        ) : (
          <div className={styles.scheduledList}>
            {posts.length === 0 && (
              <p className={styles.emptyState}>予約投稿はまだありません。</p>
            )}
            {posts.map((post) => (
              <div key={post.id} className={styles.scheduledRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.mediaUrl} alt={post.summary} className={styles.googlePostThumb} />
                <div className={styles.scheduledBody}>
                  <p className={styles.postCaption}>{post.summary}</p>
                  <p className={styles.postMeta}>
                    公開予定: {new Date(post.scheduledAt).toLocaleString("ja-JP")} ・
                    <span className={styles.badgeConnected}>{STATUS_LABEL[post.status]}</span>
                    {post.errorMessage && ` (${post.errorMessage})`}
                  </p>
                </div>
                {post.status === "PENDING" && (
                  <button className={styles.linkButton} onClick={() => handleCancel(post.id)}>
                    取消
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
