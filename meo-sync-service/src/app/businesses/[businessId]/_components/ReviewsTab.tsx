"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation, GoogleReview } from "@/lib/types";

export default function ReviewsTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/google/locations`);
    const data = await res.json();
    setLocations(data.locations);
    setLocationId((prev) => prev || data.locations[0]?.id || "");
  }, [businessId]);

  const loadReviews = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    const res = await fetch(
      `/api/businesses/${businessId}/reviews?locationId=${encodeURIComponent(locationId)}`
    );
    const data = await res.json();
    setReviews(data.reviews ?? []);
    setLoading(false);
  }, [businessId, locationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReviews();
  }, [loadReviews]);

  async function handleReply(reviewId: string) {
    const replyText = drafts[reviewId]?.trim();
    if (!replyText) return;
    setSendingId(reviewId);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/reviews/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, reviewId, replyText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "返信に失敗しました");
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingId(null);
    }
  }

  const unrepliedCount = reviews.filter((r) => !r.reply).length;

  return (
    <div>
      <section className={styles.controls}>
        <label className={styles.locationSelect}>
          対象ロケーション:
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.badgeConnected}>未返信 {unrepliedCount}件</span>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : (
        <div className={styles.reviewList}>
          {reviews.length === 0 && (
            <p className={styles.emptyState}>クチコミはまだありません。</p>
          )}
          {reviews.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <span className={styles.reviewerName}>{review.reviewerName}</span>
                <span className={styles.reviewStars}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
                <span className={styles.postMeta}>
                  {new Date(review.createTime).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <p className={styles.reviewComment}>{review.comment}</p>

              {review.reply ? (
                <div className={styles.reviewReply}>
                  <span className={styles.reviewReplyLabel}>オーナーからの返信</span>
                  <p>{review.reply.comment}</p>
                </div>
              ) : (
                <div className={styles.replyForm}>
                  <textarea
                    className={styles.textarea}
                    placeholder="返信を入力..."
                    value={drafts[review.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))
                    }
                  />
                  <button
                    className={styles.secondaryButton}
                    onClick={() => handleReply(review.id)}
                    disabled={sendingId === review.id || !drafts[review.id]?.trim()}
                  >
                    {sendingId === review.id ? "送信中..." : "返信する"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
