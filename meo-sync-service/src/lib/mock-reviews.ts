import { GoogleReview } from "./types";

// Googleクチコミのダミークライアント(デモモード用)。
// 作成された返信はサーバープロセス内のメモリにのみ保持する。

const BASE_REVIEWS: Omit<GoogleReview, "reply">[] = [
  {
    id: "mock_review_1",
    locationId: "gbp_loc_001",
    reviewerName: "田中 太郎",
    rating: 5,
    comment: "雰囲気が良くスタッフの対応も丁寧でした。また利用したいです。",
    createTime: "2026-08-01T03:00:00.000Z",
  },
  {
    id: "mock_review_2",
    locationId: "gbp_loc_001",
    reviewerName: "鈴木 花子",
    rating: 3,
    comment: "料理は美味しかったですが、少し待ち時間が長かったです。",
    createTime: "2026-08-03T08:20:00.000Z",
  },
  {
    id: "mock_review_3",
    locationId: "gbp_loc_001",
    reviewerName: "佐藤 次郎",
    rating: 2,
    comment: "駐車場がわかりにくく、店員さんの対応もやや冷たく感じました。",
    createTime: "2026-08-05T11:45:00.000Z",
  },
];

const globalForMock = globalThis as unknown as {
  __meoMockReviewReplies?: Map<string, { comment: string; updateTime: string }>;
};

function getReplies() {
  if (!globalForMock.__meoMockReviewReplies) {
    globalForMock.__meoMockReviewReplies = new Map();
  }
  return globalForMock.__meoMockReviewReplies;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchReviews(): Promise<GoogleReview[]> {
  await delay(150);
  const replies = getReplies();
  return BASE_REVIEWS.map((r) => ({ ...r, reply: replies.get(r.id) ?? null }));
}

export async function replyToReview(
  reviewId: string,
  replyText: string
): Promise<void> {
  await delay(200);
  if (!BASE_REVIEWS.some((r) => r.id === reviewId)) {
    throw new Error(`Unknown review: ${reviewId}`);
  }
  getReplies().set(reviewId, {
    comment: replyText,
    updateTime: new Date().toISOString(),
  });
}
