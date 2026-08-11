// ドメインモデル定義
// MVPプロトタイプでは Instagram / Google Business Profile とも実APIの代わりに
// mock-instagram.ts / mock-google-business.ts のダミー実装を使用する。
// 本番接続する際はこれらの型はそのままに、mock-*.ts を実APIクライアントへ差し替える。

export type InstagramPost = {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl: string;
  permalink: string;
  timestamp: string; // ISO8601
  likeCount: number;
  commentCount: number;
};

export type InstagramAccount = {
  id: string;
  username: string;
  profilePictureUrl: string;
};

export type GoogleBusinessLocation = {
  id: string;
  name: string;
  address: string;
  mapsUrl: string;
  placeId: string | null; // クチコミ依頼リンクの生成に使用
};

export type GoogleBusinessPostStatus = "LIVE" | "REJECTED" | "PENDING";

export type GoogleBusinessPost = {
  id: string;
  locationId: string;
  summary: string;
  mediaUrl: string;
  createdAt: string; // ISO8601
  status: GoogleBusinessPostStatus;
  sourceInstagramPostId: string;
};

// Instagram投稿 <-> Google ビジネスプロフィール投稿の紐づけ記録
export type LinkMapping = {
  instagramPostId: string;
  googleBusinessPostId: string;
  locationId: string;
  linkedAt: string; // ISO8601
};

export type GoogleReview = {
  id: string;
  locationId: string;
  reviewerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createTime: string; // ISO8601
  reply: { comment: string; updateTime: string } | null;
};

// Google Business Profile Performance API の日次インサイト
export type DailyMetric = { date: string; value: number };

export type InsightsSummary = {
  locationId: string;
  rangeStart: string;
  rangeEnd: string;
  views: DailyMetric[]; // 検索/マップでの表示回数
  searchKeywords: { keyword: string; count: number }[];
  callClicks: number;
  websiteClicks: number;
  directionRequests: number;
};

export type ScheduledPost = {
  id: string;
  locationId: string;
  summary: string;
  mediaUrl: string;
  scheduledAt: string; // ISO8601
  status: "PENDING" | "PUBLISHED" | "FAILED";
  errorMessage: string | null;
  publishedAt: string | null;
};

export type QAEntry = {
  id: string;
  locationId: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
};

export type RankCheckResult = {
  id: string;
  locationId: string;
  keyword: string;
  rank: number | null; // nullは圏外
  checkedAt: string; // ISO8601
};

// Googleビジネスプロフィールの商品・サービス(Products)カタログ。
// 検索結果・マップ上で商品名/価格/写真を目立たせられる公式機能。
export type BusinessProduct = {
  id: string;
  locationId: string;
  category: string;
  name: string;
  description: string;
  priceYen: number | null;
  photoUrl: string;
  createdAt: string; // ISO8601
};
