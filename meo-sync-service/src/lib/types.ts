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
