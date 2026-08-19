"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation, QAEntry } from "@/lib/types";

export default function QATab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [entries, setEntries] = useState<QAEntry[]>([]);
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

  const loadEntries = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    const res = await fetch(
      `/api/businesses/${businessId}/qa?locationId=${encodeURIComponent(locationId)}`
    );
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, [businessId, locationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, [loadEntries]);

  async function handleAnswer(entry: QAEntry) {
    const answerText = drafts[entry.id]?.trim();
    if (!answerText) return;
    setSendingId(entry.id);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/qa/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          questionId: entry.id,
          question: entry.question,
          answerText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "回答に失敗しました");
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingId(null);
    }
  }

  const unansweredCount = entries.filter((e) => !e.answer).length;

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
        <span className={styles.badgeConnected}>未回答 {unansweredCount}件</span>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : (
        <div className={styles.reviewList}>
          {entries.length === 0 && (
            <p className={styles.emptyState}>質問はまだありません。</p>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className={styles.reviewCard}>
              <p className={styles.reviewComment}>{entry.question}</p>
              {entry.answer ? (
                <div className={styles.reviewReply}>
                  <span className={styles.reviewReplyLabel}>回答済み</span>
                  <p>{entry.answer}</p>
                </div>
              ) : (
                <div className={styles.replyForm}>
                  <textarea
                    className={styles.textarea}
                    placeholder="回答を入力..."
                    value={drafts[entry.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))
                    }
                  />
                  <button
                    className={styles.secondaryButton}
                    onClick={() => handleAnswer(entry)}
                    disabled={sendingId === entry.id || !drafts[entry.id]?.trim()}
                  >
                    {sendingId === entry.id ? "送信中..." : "回答する"}
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
