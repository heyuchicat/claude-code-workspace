// Google Places API (New) クライアント。
// Business Profile APIs とは異なり、APIキーで利用でき、特別な利用申請は不要
// (Google Cloud Consoleで「Places API (New)」を有効化し、課金を有効にするだけで使える)。
// 参考: https://developers.google.com/maps/documentation/places/web-service/overview

const PLACES_BASE = "https://places.googleapis.com/v1";

function requireApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error(
      "環境変数 GOOGLE_MAPS_API_KEY が設定されていません(競合比較機能にはGoogle Places APIのAPIキーが必要です)"
    );
  }
  return key;
}

export type PlaceSearchResult = {
  placeId: string;
  name: string;
  address: string;
};

export type PlaceRatingInfo = {
  placeId: string;
  name: string;
  rating: number | null;
  userRatingCount: number;
};

export async function searchPlacesByText(query: string): Promise<PlaceSearchResult[]> {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": requireApiKey(),
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "ja" }),
  });
  if (!res.ok) {
    throw new Error(`Google Places検索に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  type ApiPlace = { id: string; displayName?: { text?: string }; formattedAddress?: string };
  return ((data.places ?? []) as ApiPlace[]).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? p.id,
    address: p.formattedAddress ?? "",
  }));
}

export async function fetchPlaceRating(placeId: string): Promise<PlaceRatingInfo> {
  const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": requireApiKey(),
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount",
    },
  });
  if (!res.ok) {
    throw new Error(`Google Places情報の取得に失敗しました: ${await res.text()}`);
  }
  const data = await res.json();
  return {
    placeId: data.id,
    name: data.displayName?.text ?? data.id,
    rating: typeof data.rating === "number" ? data.rating : null,
    userRatingCount: data.userRatingCount ?? 0,
  };
}
