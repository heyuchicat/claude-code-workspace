import { GoogleReview } from "./types";
import { getValidGoogleAccessToken } from "./google-business-client";

// Googleクチコミの実APIクライアント。
// 参考: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews
// 注意: レビューAPIも legacy mybusiness v4 の一部で、Googleの利用申請が必要です。

const LEGACY_MYBUSINESS_BASE = "https://mybusiness.googleapis.com/v4";

const STAR_RATING_MAP: Record<string, 1 | 2 | 3 | 4 | 5> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

type ApiReview = {
  reviewId: string;
  reviewer?: { displayName?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  reviewReply?: { comment: string; updateTime: string };
};

function toGoogleReview(raw: ApiReview, locationId: string): GoogleReview {
  return {
    id: raw.reviewId,
    locationId,
    reviewerName: raw.reviewer?.displayName ?? "匿名ユーザー",
    rating: STAR_RATING_MAP[raw.starRating ?? "FIVE"] ?? 5,
    comment: raw.comment ?? "",
    createTime: raw.createTime ?? new Date().toISOString(),
    reply: raw.reviewReply
      ? { comment: raw.reviewReply.comment, updateTime: raw.reviewReply.updateTime }
      : null,
  };
}

export async function fetchRealReviews(
  businessId: string,
  locationId: string
): Promise<GoogleReview[]> {
  const { accessToken, accountResourceName } =
    await getValidGoogleAccessToken(businessId);
  const parent = `${accountResourceName}/${locationId}`;

  const res = await fetch(`${LEGACY_MYBUSINESS_BASE}/${parent}/reviews`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`クチコミ取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return ((data.reviews ?? []) as ApiReview[]).map((r) => toGoogleReview(r, locationId));
}

export async function replyToRealReview(
  businessId: string,
  locationId: string,
  reviewId: string,
  replyText: string
): Promise<void> {
  const { accessToken, accountResourceName } =
    await getValidGoogleAccessToken(businessId);
  const parent = `${accountResourceName}/${locationId}`;

  const res = await fetch(
    `${LEGACY_MYBUSINESS_BASE}/${parent}/reviews/${reviewId}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment: replyText }),
    }
  );
  if (!res.ok) {
    throw new Error(`クチコミへの返信に失敗しました: ${await res.text()}`);
  }
}
