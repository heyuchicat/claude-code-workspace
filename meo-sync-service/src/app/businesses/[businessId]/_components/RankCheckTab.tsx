"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation, RankCheckResult } from "@/lib/types";

export default function RankCheckTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<RankCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/google/locations`);
    const data = await res.json();
    setLocations(data.locations);
    setLocationId((prev) => prev || data.locations[0]?.id || "");
    setBusinessName((prev) => prev || data.locations[0]?.name || "");
  }, [businessId]);

  const loadResults = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    const res = await fetch(
      `/api/businesses/${businessId}/rank-checks?locationId=${encodeURIComponent(locationId)}`
    );
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }, [businessId, locationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadResults();
  }, [loadResults]);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/rank-checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, keyword, businessName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "順位チェックに失敗しました");
      await loadResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <p className={styles.riskBanner}>
        ⚠ この機能は実験的です。Googleマップの検索結果ページを自動取得して順位を推定しており、
        Googleの利用規約に抵触する可能性があります。公式APIではないため精度・安定性は保証されません。
        頻繁な実行はアカウント/IPブロックの原因になります。自己責任でご利用ください。
      </p>

      <form className={styles.scheduleForm} onSubmit={handleCheck}>
        <h2 className={styles.sectionTitle}>順位を調べる</h2>
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
        <input
          className={styles.input}
          placeholder="店舗名(検索結果内で照合する名前)"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
        />
        <input
          className={styles.input}
          placeholder="検索キーワード(例: カフェ 渋谷)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.primaryButton} disabled={checking}>
          {checking ? "確認中...(最大20秒程度)" : "順位を調べる"}
        </button>
      </form>

      <section>
        <h2 className={styles.sectionTitle}>チェック履歴</h2>
        {loading ? (
          <p className={styles.loading}>読み込み中...</p>
        ) : (
          <div className={styles.rankList}>
            {results.length === 0 && (
              <p className={styles.emptyState}>まだチェック履歴はありません。</p>
            )}
            {results.map((r) => (
              <div key={r.id} className={styles.rankRow}>
                <span className={styles.postCaption}>{r.keyword}</span>
                <span className={styles.rankValue}>
                  {r.rank ? `${r.rank}位` : "圏外(未検出)"}
                </span>
                <span className={styles.postMeta}>
                  {new Date(r.checkedAt).toLocaleString("ja-JP")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
