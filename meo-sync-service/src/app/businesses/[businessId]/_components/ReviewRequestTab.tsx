"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation } from "@/lib/types";

export default function ReviewRequestTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [url, setUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("リンクをコピー");

  const loadLocations = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}/google/locations`);
    const data = await res.json();
    setLocations(data.locations);
    setLocationId((prev) => prev || data.locations[0]?.id || "");
  }, [businessId]);

  const loadLink = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/businesses/${businessId}/review-link?locationId=${encodeURIComponent(locationId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "取得に失敗しました");
      setUrl("");
      setQrCodeDataUrl("");
    } else {
      setUrl(data.url);
      setQrCodeDataUrl(data.qrCodeDataUrl);
    }
    setLoading(false);
  }, [businessId, locationId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLink();
  }, [loadLink]);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopyLabel("コピーしました");
    setTimeout(() => setCopyLabel("リンクをコピー"), 2000);
  }

  return (
    <div>
      <p className={styles.demoBadge}>
        来店客にこのリンク/QRコードを渡すと、Googleのクチコミ投稿画面へ直接移動できます。
        レジ横のPOPやレシート、LINE配信などでの活用にご利用ください。
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
        url && (
          <div className={styles.chartCard} style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeDataUrl} alt="クチコミ依頼QRコード" width={200} height={200} />
            <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
              <p className={styles.postMeta} style={{ wordBreak: "break-all" }}>{url}</p>
              <button className={styles.primaryButton} onClick={handleCopy} style={{ alignSelf: "flex-start" }}>
                {copyLabel}
              </button>
              <a className={styles.linkButton} href={qrCodeDataUrl} download="review-qr.png">
                QRコード画像をダウンロード
              </a>
            </div>
          </div>
        )
      )}
    </div>
  );
}
