"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation, InsightsSummary } from "@/lib/types";

function ViewsChart({ views }: { views: InsightsSummary["views"] }) {
  const max = Math.max(1, ...views.map((v) => v.value));
  const width = 640;
  const height = 160;
  const barGap = 4;
  const barWidth = views.length > 0 ? width / views.length - barGap : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={styles.chartSvg}
      role="img"
      aria-label="日別の閲覧数推移"
    >
      {views.map((v, i) => {
        const barHeight = (v.value / max) * (height - 24);
        const x = i * (barWidth + barGap);
        const y = height - barHeight - 20;
        return (
          <g key={v.date}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={2} fill="#2563eb" opacity={0.85} />
            <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fontSize="8" fill="currentColor" opacity={0.6}>
              {v.date.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function InsightsTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/google/locations`);
    const data = await res.json();
    setLocations(data.locations);
    setLocationId((prev) => prev || data.locations[0]?.id || "");
  }, [businessId]);

  const loadInsights = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    const res = await fetch(
      `/api/businesses/${businessId}/insights?locationId=${encodeURIComponent(locationId)}`
    );
    const data = await res.json();
    setInsights(data.insights ?? null);
    setLoading(false);
  }, [businessId, locationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInsights();
  }, [loadInsights]);

  const totalViews = insights?.views.reduce((sum, v) => sum + v.value, 0) ?? 0;

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
      </section>

      {loading || !insights ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : (
        <>
          <section className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalViews}</span>
              <span className={styles.statLabel}>
                閲覧数({insights.rangeStart}〜{insights.rangeEnd})
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{insights.callClicks}</span>
              <span className={styles.statLabel}>電話タップ数</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{insights.websiteClicks}</span>
              <span className={styles.statLabel}>ウェブサイトクリック数</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{insights.directionRequests}</span>
              <span className={styles.statLabel}>ルート検索数</span>
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>日別の閲覧数</h2>
            <div className={styles.chartCard}>
              <ViewsChart views={insights.views} />
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>検索キーワード</h2>
            <div className={styles.keywordList}>
              {insights.searchKeywords.map((k) => (
                <div key={k.keyword} className={styles.keywordRow}>
                  <span>{k.keyword}</span>
                  <span className={styles.keywordCount}>{k.count}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
