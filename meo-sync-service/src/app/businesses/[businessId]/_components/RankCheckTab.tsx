"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation, RankCheckResult } from "@/lib/types";

type TrackedKeyword = {
  id: string;
  locationId: string;
  keyword: string;
  businessNameMatch: string;
};

function RankTrendChart({ results }: { results: RankCheckResult[] }) {
  const ordered = [...results].reverse(); // 古い→新しい
  const width = 480;
  const height = 100;
  const barGap = 4;
  const barWidth = ordered.length > 0 ? width / ordered.length - barGap : 0;
  const worst = 20; // 圏外扱いの基準(表示用)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.chartSvg} style={{ height: 100 }}>
      {ordered.map((r, i) => {
        const rank = r.rank ?? worst;
        const barHeight = ((worst - rank + 1) / worst) * (height - 16);
        const x = i * (barWidth + barGap);
        const y = height - barHeight - 12;
        return (
          <g key={r.id}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              fill={r.rank ? "#2563eb" : "#cbd5e1"}
              opacity={0.85}
            />
            <text x={x + barWidth / 2} y={height - 2} textAnchor="middle" fontSize="7" fill="currentColor" opacity={0.6}>
              {r.rank ?? "―"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function RankCheckTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<RankCheckResult[]>([]);
  const [trackedKeywords, setTrackedKeywords] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [registering, setRegistering] = useState(false);
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

  const loadTrackedKeywords = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/tracked-keywords`);
    const data = await res.json();
    setTrackedKeywords(data.keywords ?? []);
  }, [businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
    loadTrackedKeywords();
  }, [loadLocations, loadTrackedKeywords]);

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

  async function handleRegisterKeyword() {
    if (!keyword.trim()) return;
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/tracked-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, keyword, businessNameMatch: businessName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");
      await loadTrackedKeywords();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegistering(false);
    }
  }

  async function handleRemoveKeyword(id: string) {
    await fetch(`/api/businesses/${businessId}/tracked-keywords/${id}`, { method: "DELETE" });
    await loadTrackedKeywords();
  }

  const resultsByKeyword = new Map<string, RankCheckResult[]>();
  for (const r of results) {
    const list = resultsByKeyword.get(r.keyword) ?? [];
    list.push(r);
    resultsByKeyword.set(r.keyword, list);
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
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.primaryButton} disabled={checking}>
            {checking ? "確認中...(最大20秒程度)" : "今すぐ調べる"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleRegisterKeyword}
            disabled={registering || !keyword.trim()}
          >
            {registering ? "登録中..." : "このキーワードを定期チェック登録"}
          </button>
        </div>
      </form>

      <section>
        <h2 className={styles.sectionTitle}>定期チェック登録キーワード</h2>
        <p className={styles.postMeta}>
          外部cronから <code>/api/cron/check-tracked-keywords</code> を定期実行(例: 1日1回)すると、
          登録したキーワードを自動でチェックします。
        </p>
        <div className={styles.rankList}>
          {trackedKeywords.length === 0 && (
            <p className={styles.emptyState}>登録済みのキーワードはありません。</p>
          )}
          {trackedKeywords.map((k) => (
            <div key={k.id} className={styles.rankRow}>
              <span className={styles.postCaption}>{k.keyword}</span>
              <span className={styles.postMeta}>照合名: {k.businessNameMatch}</span>
              <button className={styles.linkButton} onClick={() => handleRemoveKeyword(k.id)}>
                削除
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>キーワード別の推移</h2>
        {loading ? (
          <p className={styles.loading}>読み込み中...</p>
        ) : resultsByKeyword.size === 0 ? (
          <p className={styles.emptyState}>まだチェック履歴はありません。</p>
        ) : (
          [...resultsByKeyword.entries()].map(([kw, list]) => (
            <div key={kw} className={styles.chartCard} style={{ marginBottom: 12 }}>
              <p className={styles.postCaption}><strong>{kw}</strong></p>
              <RankTrendChart results={list.slice(0, 14)} />
            </div>
          ))
        )}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>チェック履歴(全件)</h2>
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
