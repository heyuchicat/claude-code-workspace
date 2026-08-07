import { GoogleBusinessLocation, GoogleBusinessPost } from "./types";
import { store } from "./store";

// Google Business Profile API (旧 Google マイビジネス) のダミークライアント。
// 本番では https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
// を呼び出す実装に差し替える。(要: Google Cloud プロジェクト + OAuth2 + Business Profile APIs 有効化)

const MOCK_LOCATIONS: GoogleBusinessLocation[] = [
  {
    id: "gbp_loc_001",
    name: "サンプルカフェ 東京本店",
    address: "東京都渋谷区神南1-2-3",
    mapsUrl: "https://maps.google.com/?cid=mock001",
  },
];

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGoogleBusinessLocations(): Promise<
  GoogleBusinessLocation[]
> {
  await delay(150);
  return MOCK_LOCATIONS;
}

export type CreateGoogleBusinessPostInput = {
  locationId: string;
  summary: string;
  mediaUrl: string;
  sourceInstagramPostId: string;
};

// 実APIでは POST localPosts に相当。ここではstoreに保存するだけのダミー実装。
export async function createGoogleBusinessPost(
  input: CreateGoogleBusinessPostInput
): Promise<GoogleBusinessPost> {
  await delay(300);

  const location = MOCK_LOCATIONS.find((l) => l.id === input.locationId);
  if (!location) {
    throw new Error(`Unknown Google Business location: ${input.locationId}`);
  }

  const post: GoogleBusinessPost = {
    id: `gbp_post_${store.nextGoogleBusinessPostSeq()}`,
    locationId: input.locationId,
    summary: input.summary,
    mediaUrl: input.mediaUrl,
    createdAt: new Date().toISOString(),
    status: "LIVE",
    sourceInstagramPostId: input.sourceInstagramPostId,
  };

  store.addGoogleBusinessPost(post);
  return post;
}

export async function fetchGoogleBusinessPosts(): Promise<
  GoogleBusinessPost[]
> {
  await delay(100);
  return store.listGoogleBusinessPosts();
}
