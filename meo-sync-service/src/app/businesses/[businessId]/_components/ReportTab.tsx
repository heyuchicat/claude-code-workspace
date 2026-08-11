"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../dashboard.module.css";
import type { GoogleBusinessLocation } from "@/lib/types";

export default function ReportTab({ businessId }: { businessId: string }) {
  const [locations, setLocations] = useState<GoogleBusinessLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [locationsRes, businessRes] = await Promise.all([
      fetch(`/api/businesses/${businessId}/google/locations`).then((r) => r.json()),
      fetch(`/api/businesses/${businessId}`).then((r) => r.json()),
    ]);
    setLocations(locationsRes.locations);
    setLocationId((prev) => prev || locationsRes.locations[0]?.id || "");
    setReportEmail(businessRes.business?.reportEmail ?? "");
    setSavedEmail(businessRes.business?.reportEmail ?? null);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setSavedEmail(data.business.reportEmail);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!locationId) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/report?locationId=${encodeURIComponent(locationId)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "生成に失敗しました");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "monthly-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <p className={styles.loading}>読み込み中...</p>;

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
        <button className={styles.primaryButton} onClick={handleDownload} disabled={downloading}>
          {downloading ? "生成中...(数秒かかります)" : "PDFレポートをダウンロード"}
        </button>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <form
        className={styles.scheduleForm}
        onSubmit={handleSave}
        style={{ marginTop: 24 }}
      >
        <h2 className={styles.sectionTitle}>月次レポートの自動送付</h2>
        <p className={styles.postMeta}>
          送付先メールアドレスを設定すると、外部cronから
          <code>/api/cron/send-monthly-reports</code> を定期実行した際に自動でPDFが送られます
          (メール送信にはサーバー側でSMTP設定が必要です。README参照)。
        </p>
        <input
          className={styles.input}
          type="email"
          placeholder="送付先メールアドレス(未設定なら自動送付しません)"
          value={reportEmail}
          onChange={(e) => setReportEmail(e.target.value)}
        />
        {saved && <p className={styles.notice}>保存しました{savedEmail ? `(送付先: ${savedEmail})` : "(自動送付は無効化されました)"}</p>}
        <button className={styles.primaryButton} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
