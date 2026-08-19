"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation } from "@/lib/types";

type PlaceSearchResult = { placeId: string; name: string; address: string };
type PlaceRatingInfo = { placeId: string; name: string; rating: number | null; userRatingCount: number };
type CompetitorRecord = { id: string; placeId: string; label: string };

export default function CompetitorsTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [competitors, setCompetitors] = useState<CompetitorRecord[]>([]);
  const [own, setOwn] = useState<PlaceRatingInfo | null>(null);
  const [competitorRatings, setCompetitorRatings] = useState<(PlaceRatingInfo & { competitorId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/google/locations`);
    const data = await res.json();
    setLocations(data.locations);
    setLocationId((prev) => prev || data.locations[0]?.id || "");
  }, [businessId]);

  const loadCompetitors = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/competitors`);
    const data = await res.json();
    setCompetitors(data.competitors ?? []);
  }, [businessId]);

  const loadComparison = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/businesses/${businessId}/competitors/compare?locationId=${encodeURIComponent(locationId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "取得に失敗しました");
      setOwn(null);
      setCompetitorRatings([]);
    } else {
      setOwn(data.own);
      setCompetitorRatings(data.competitors);
    }
    setLoading(false);
  }, [businessId, locationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
    loadCompetitors();
  }, [loadLocations, loadCompetitors]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComparison();
  }, [loadComparison]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/competitors/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "検索に失敗しました");
      setSearchResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(placeId: string) {
    setAdding(placeId);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました");
      setSearchResults([]);
      setQuery("");
      await loadCompetitors();
      await loadComparison();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(null);
    }
  }

  async function handleRemove(competitorId: string) {
    await fetch(`/api/businesses/${businessId}/competitors/${competitorId}`, { method: "DELETE" });
    await loadCompetitors();
    await loadComparison();
  }

  return (
    <div>
      <p className={styles.demoBadge}>
        Google Places API(APIキー方式)を使用しており、Business Profile APIの承認とは無関係に利用できます。
        <br />
        利用には環境変数 <code>GOOGLE_MAPS_API_KEY</code> の設定と、Google Cloud Consoleで
        「Places API (New)」の有効化・課金設定が必要です。
      </p>

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
      </section>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : (
        <section>
          <h2 className={styles.sectionTitle}>評価の比較</h2>
          <div className={styles.rankList}>
            {own && (
              <div className={styles.rankRow} style={{ background: "rgba(37,99,235,0.06)" }}>
                <span className={styles.postCaption}>
                  <strong>{own.name}(自店舗)</strong>
                </span>
                <span className={styles.rankValue}>
                  {own.rating ?? "―"} ★ ({own.userRatingCount}件)
                </span>
              </div>
            )}
            {competitorRatings.map((c) => (
              <div key={c.competitorId} className={styles.rankRow}>
                <span className={styles.postCaption}>{c.name}</span>
                <span className={styles.rankValue}>
                  {c.rating ?? "―"} ★ ({c.userRatingCount}件)
                </span>
                <button className={styles.linkButton} onClick={() => handleRemove(c.competitorId)}>
                  削除
                </button>
              </div>
            ))}
            {competitors.length === 0 && (
              <p className={styles.emptyState}>まだ競合店が登録されていません。</p>
            )}
          </div>
        </section>
      )}

      <form className={styles.scheduleForm} onSubmit={handleSearch} style={{ marginTop: 24 }}>
        <h2 className={styles.sectionTitle}>競合店を追加</h2>
        <input
          className={styles.input}
          placeholder="店名で検索(例: ○○カフェ 渋谷)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={styles.primaryButton} disabled={searching}>
          {searching ? "検索中..." : "検索"}
        </button>

        {searchResults.length > 0 && (
          <div className={styles.rankList} style={{ marginTop: 10 }}>
            {searchResults.map((r) => (
              <div key={r.placeId} className={styles.rankRow}>
                <span className={styles.postCaption}>
                  {r.name}
                  <br />
                  <span className={styles.postMeta}>{r.address}</span>
                </span>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => handleAdd(r.placeId)}
                  disabled={adding === r.placeId}
                >
                  {adding === r.placeId ? "追加中..." : "競合として登録"}
                </button>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
