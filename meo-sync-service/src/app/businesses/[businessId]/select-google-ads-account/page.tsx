"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../dashboard.module.css";
import type { GoogleAdsCustomerOption } from "@/lib/pending-google-ads-connection";

function SelectCustomerForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingId = searchParams.get("pendingId");

  const [customers, setCustomers] = useState<GoogleAdsCustomerOption[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!pendingId) {
      setError("不正なアクセスです");
      setLoading(false);
      return;
    }
    const res = await fetch(
      `/api/businesses/${businessId}/google-ads-account-selection?pendingId=${encodeURIComponent(pendingId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "読み込みに失敗しました");
      setLoading(false);
      return;
    }
    setCustomers(data.customers);
    setSelected(data.customers[0]?.resourceName ?? "");
    setLoading(false);
  }, [businessId, pendingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/google-ads-account-selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, customerResourceName: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "選択に失敗しました");
      router.push(`/businesses/${businessId}?connected=google_ads`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>連携するGoogle広告アカウントを選択</h1>
        <p className={styles.subtitle}>
          このGoogleアカウントは複数の広告アカウントにアクセスできます。
          この店舗に紐づけるものを1つ選んでください。
        </p>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loading}>読み込み中...</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {customers.map((c) => (
            <label
              key={c.resourceName}
              className={styles.accountCard}
              style={{ cursor: "pointer", flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <input
                type="radio"
                name="customer"
                value={c.resourceName}
                checked={selected === c.resourceName}
                onChange={() => setSelected(c.resourceName)}
              />
              <span className={styles.accountName}>{c.descriptiveName}</span>
            </label>
          ))}
          <button className={styles.primaryButton} disabled={submitting || !selected}>
            {submitting ? "接続中..." : "このアカウントで連携する"}
          </button>
        </form>
      )}
    </main>
  );
}

export default function SelectGoogleAdsAccountPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  return (
    <Suspense fallback={null}>
      <SelectCustomerForm businessId={businessId} />
    </Suspense>
  );
}
