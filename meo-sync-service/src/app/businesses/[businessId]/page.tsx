"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./dashboard.module.css";
import SyncTab from "./_components/SyncTab";
import ReviewsTab from "./_components/ReviewsTab";
import InsightsTab from "./_components/InsightsTab";
import ScheduledPostsTab from "./_components/ScheduledPostsTab";
import QATab from "./_components/QATab";
import RankCheckTab from "./_components/RankCheckTab";
import ProductsTab from "./_components/ProductsTab";
import ReviewRequestTab from "./_components/ReviewRequestTab";
import CompetitorsTab from "./_components/CompetitorsTab";
import ReportTab from "./_components/ReportTab";
import NotificationSettingsTab from "./_components/NotificationSettingsTab";
import ExternalListingsTab from "./_components/ExternalListingsTab";

const TABS = [
  { id: "sync", label: "投稿連携" },
  { id: "reviews", label: "クチコミ" },
  { id: "reviewRequest", label: "口コミ依頼" },
  { id: "insights", label: "インサイト" },
  { id: "competitors", label: "競合比較" },
  { id: "scheduled", label: "予約投稿" },
  { id: "qa", label: "Q&A" },
  { id: "products", label: "商品・サービス" },
  { id: "rank", label: "順位チェック" },
  { id: "report", label: "レポート" },
  { id: "notifications", label: "通知設定" },
  { id: "externalListings", label: "外部リンク" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Dashboard({ businessId }: { businessId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [businessName, setBusinessName] = useState<string>("");
  const [tab, setTab] = useState<TabId>("sync");
  const [notice] = useState<string | null>(
    searchParams.get("connected") ? "連携が完了しました" : null
  );
  const [urlError] = useState<string | null>(searchParams.get("error"));

  const loadBusiness = useCallback(async () => {
    const res = await fetch(`/api/businesses/${businessId}`);
    if (!res.ok) {
      router.push("/businesses");
      return;
    }
    const data = await res.json();
    setBusinessName(data.business.name);
  }, [businessId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBusiness();
  }, [loadBusiness]);

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/businesses" className={styles.backLink}>
          ← 店舗一覧
        </Link>
        <div className={styles.headerRow}>
          <div>
            <h1>{businessName || "MEO Sync"}</h1>
            <p className={styles.subtitle}>
              Instagram連携・クチコミ・インサイト・予約投稿・順位チェックを一元管理
            </p>
          </div>
          <button className={styles.logoutButton} onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>

      {notice && <p className={styles.notice}>{notice}</p>}
      {urlError && <p className={styles.error}>{urlError}</p>}

      <nav className={styles.tabNav}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tabButton} ${tab === t.id ? styles.tabButtonActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "sync" && <SyncTab businessId={businessId} />}
      {tab === "reviews" && <ReviewsTab businessId={businessId} />}
      {tab === "insights" && <InsightsTab businessId={businessId} />}
      {tab === "scheduled" && <ScheduledPostsTab businessId={businessId} />}
      {tab === "qa" && <QATab businessId={businessId} />}
      {tab === "products" && <ProductsTab businessId={businessId} />}
      {tab === "rank" && <RankCheckTab businessId={businessId} />}
      {tab === "reviewRequest" && <ReviewRequestTab businessId={businessId} />}
      {tab === "competitors" && <CompetitorsTab businessId={businessId} />}
      {tab === "report" && <ReportTab businessId={businessId} />}
      {tab === "notifications" && <NotificationSettingsTab businessId={businessId} />}
      {tab === "externalListings" && <ExternalListingsTab businessId={businessId} />}
    </main>
  );
}

export default function BusinessDashboardPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  return (
    <Suspense fallback={null}>
      <Dashboard businessId={businessId} />
    </Suspense>
  );
}
