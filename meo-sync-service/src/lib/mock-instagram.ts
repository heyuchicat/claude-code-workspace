import { InstagramAccount, InstagramPost } from "./types";

// Instagram Graph API のダミークライアント。
// 本番では https://graph.instagram.com/{ig-user-id}/media を呼び出す実装に差し替える。
// (要: Instagram Business アカウント + Facebook App + OAuthアクセストークン)

const MOCK_ACCOUNT: InstagramAccount = {
  id: "ig_17841400000000000",
  username: "sample_cafe_tokyo",
  profilePictureUrl: "https://picsum.photos/seed/ig-account/200",
};

const MOCK_POSTS: InstagramPost[] = [
  {
    id: "ig_post_1001",
    caption: "本日の日替わりランチ🍝 数量限定です #カフェ #ランチ",
    mediaType: "IMAGE",
    mediaUrl: "https://picsum.photos/seed/ig1/800/800",
    permalink: "https://www.instagram.com/p/mock1001/",
    timestamp: "2026-08-06T02:30:00.000Z",
    likeCount: 128,
    commentCount: 6,
  },
  {
    id: "ig_post_1002",
    caption: "新作の季節限定パフェが登場しました🍨 期間限定なのでお早めに！",
    mediaType: "IMAGE",
    mediaUrl: "https://picsum.photos/seed/ig2/800/800",
    permalink: "https://www.instagram.com/p/mock1002/",
    timestamp: "2026-08-05T09:15:00.000Z",
    likeCount: 342,
    commentCount: 21,
  },
  {
    id: "ig_post_1003",
    caption: "店内をリニューアルしました✨ 新しい内装をぜひ見にきてください",
    mediaType: "CAROUSEL_ALBUM",
    mediaUrl: "https://picsum.photos/seed/ig3/800/800",
    permalink: "https://www.instagram.com/p/mock1003/",
    timestamp: "2026-08-03T05:00:00.000Z",
    likeCount: 210,
    commentCount: 12,
  },
  {
    id: "ig_post_1004",
    caption: "8月の営業時間のお知らせです。お盆期間中は10:00-18:00に変更となります。",
    mediaType: "IMAGE",
    mediaUrl: "https://picsum.photos/seed/ig4/800/800",
    permalink: "https://www.instagram.com/p/mock1004/",
    timestamp: "2026-08-01T00:00:00.000Z",
    likeCount: 54,
    commentCount: 2,
  },
];

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchInstagramAccount(): Promise<InstagramAccount> {
  await delay(150);
  return MOCK_ACCOUNT;
}

export async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  await delay(150);
  return [...MOCK_POSTS].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function fetchInstagramPostById(
  id: string
): Promise<InstagramPost | undefined> {
  await delay(50);
  return MOCK_POSTS.find((p) => p.id === id);
}
