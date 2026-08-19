import { GoogleBusinessLocation, GoogleBusinessPost } from "./types";

// Google Business Profile API (旧 Google マイビジネス) のダミークライアント。
// 本番では google-business-client.ts の実装(要: OAuth連携)に差し替わる。
// 作成された投稿はサーバープロセス内のメモリにのみ保持する(デモ用途のため)。

const MOCK_LOCATIONS: GoogleBusinessLocation[] = [
  {
    id: "gbp_loc_001",
    name: "サンプルカフェ 東京本店",
    address: "東京都渋谷区神南1-2-3",
    mapsUrl: "https://maps.google.com/?cid=mock001",
    placeId: "ChIJMockPlaceId00000000000",
  },
];

const globalForMock = globalThis as unknown as {
  __meoMockGooglePosts?: GoogleBusinessPost[];
  __meoMockGooglePostSeq?: number;
};

function getMockPosts(): GoogleBusinessPost[] {
  if (!globalForMock.__meoMockGooglePosts) {
    globalForMock.__meoMockGooglePosts = [];
    globalForMock.__meoMockGooglePostSeq = 0;
  }
  return globalForMock.__meoMockGooglePosts;
}

function nextMockPostSeq(): number {
  globalForMock.__meoMockGooglePostSeq = (globalForMock.__meoMockGooglePostSeq ?? 0) + 1;
  return globalForMock.__meoMockGooglePostSeq;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGoogleBusinessLocations(): Promise<
  GoogleBusinessLocation[]
> {
  await delay(150);
  return MOCK_LOCATIONS;
}

export type MockGbpProfileFields = {
  hasName: boolean;
  hasCategory: boolean;
  hasDescription: boolean;
  hasAddress: boolean;
  hasPhone: boolean;
  hasHours: boolean;
  hasWebsite: boolean;
};

// AI運用アシスタント診断のデモ用ダミーデータ。あえて一部を未設定にして、
// デモ画面で✕判定がどう表示されるか確認できるようにしている。
export async function fetchGbpProfileFields(): Promise<MockGbpProfileFields> {
  await delay(100);
  return {
    hasName: true,
    hasCategory: true,
    hasDescription: false,
    hasAddress: true,
    hasPhone: true,
    hasHours: true,
    hasWebsite: false,
  };
}

export type CreateGoogleBusinessPostInput = {
  locationId: string;
  summary: string;
  mediaUrl: string;
  sourceInstagramPostId: string;
};

// 実APIでは POST localPosts に相当。ここではメモリに保存するだけのダミー実装。
export async function createGoogleBusinessPost(
  input: CreateGoogleBusinessPostInput
): Promise<GoogleBusinessPost> {
  await delay(300);

  const location = MOCK_LOCATIONS.find((l) => l.id === input.locationId);
  if (!location) {
    throw new Error(`Unknown Google Business location: ${input.locationId}`);
  }

  const post: GoogleBusinessPost = {
    id: `gbp_post_${nextMockPostSeq()}`,
    locationId: input.locationId,
    summary: input.summary,
    mediaUrl: input.mediaUrl,
    createdAt: new Date().toISOString(),
    status: "LIVE",
    sourceInstagramPostId: input.sourceInstagramPostId,
  };

  getMockPosts().push(post);
  return post;
}

export async function fetchGoogleBusinessPosts(): Promise<
  GoogleBusinessPost[]
> {
  await delay(100);
  return [...getMockPosts()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
