"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../dashboard.module.css";
import type { GoogleAccountOption } from "@/lib/pending-google-connection";

function SelectAccountForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingId = searchParams.get("pendingId");

  const [accounts, setAccounts] = useState<GoogleAccountOption[]>([]);
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
      `/api/businesses/${businessId}/google-account-selection?pendingId=${encodeURIComponent(pendingId)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "読み込みに失敗しました");
      setLoading(false);
      return;
    }
    setAccounts(data.accounts);
    setSelected(data.accounts[0]?.name ?? "");
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
      const res = await fetch(`/api/businesses/${businessId}/google-account-selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, accountResourceName: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "選択に失敗しました");
      router.push(`/businesses/${businessId}?connected=google`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>連携するGoogleアカウントを選択</h1>
        <p className={styles.subtitle}>
          このGoogleアカウントは複数のビジネスアカウントにアクセスできます。
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
          {accounts.map((a) => (
            <label
              key={a.name}
              className={styles.accountCard}
              style={{ cursor: "pointer", flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <input
                type="radio"
                name="account"
                value={a.name}
                checked={selected === a.name}
                onChange={() => setSelected(a.name)}
              />
              <span className={styles.accountName}>{a.accountName}</span>
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

export default function SelectGoogleAccountPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  return (
    <Suspense fallback={null}>
      <SelectAccountForm businessId={businessId} />
    </Suspense>
  );
}
