// mock と 実API(OAuth連携済みの場合)を切り替えるファサード。
// 各providerが接続済み(Connectionレコードあり)なら実APIを、
// 未接続ならデモ用のmockデータを使う。

import { getConnection } from "./connections";
import { GoogleBusinessLocation, GoogleBusinessPost, InstagramAccount, InstagramPost } from "./types";
import * as mockInstagram from "./mock-instagram";
import * as mockGoogle from "./mock-google-business";
import * as realInstagram from "./instagram-client";
import * as realGoogle from "./google-business-client";
import { store } from "./store";
import type { CreateGoogleBusinessPostInput } from "./mock-google-business";

export type { CreateGoogleBusinessPostInput };

async function isConnected(provider: "instagram" | "google"): Promise<boolean> {
  return (await getConnection(provider)) !== null;
}

export async function fetchInstagramAccount(): Promise<InstagramAccount> {
  if (await isConnected("instagram")) {
    return realInstagram.fetchRealInstagramAccount();
  }
  return mockInstagram.fetchInstagramAccount();
}

export async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  if (await isConnected("instagram")) {
    return realInstagram.fetchRealInstagramPosts();
  }
  return mockInstagram.fetchInstagramPosts();
}

export async function fetchInstagramPostById(
  id: string
): Promise<InstagramPost | undefined> {
  if (await isConnected("instagram")) {
    return realInstagram.fetchRealInstagramPostById(id);
  }
  return mockInstagram.fetchInstagramPostById(id);
}

export async function fetchGoogleBusinessLocations(): Promise<
  GoogleBusinessLocation[]
> {
  if (await isConnected("google")) {
    return realGoogle.fetchRealGoogleBusinessLocations();
  }
  return mockGoogle.fetchGoogleBusinessLocations();
}

export async function createGoogleBusinessPost(
  input: CreateGoogleBusinessPostInput
): Promise<GoogleBusinessPost> {
  if (await isConnected("google")) {
    return realGoogle.createRealGoogleBusinessPost(input);
  }
  return mockGoogle.createGoogleBusinessPost(input);
}

export async function fetchGoogleBusinessPosts(): Promise<
  GoogleBusinessPost[]
> {
  if (!(await isConnected("google"))) {
    return mockGoogle.fetchGoogleBusinessPosts();
  }

  const mappings = await store.listLinkMappings();
  const locationIds = [...new Set(mappings.map((m) => m.locationId))];
  const postNameToInstagramId = new Map(
    mappings.map((m) => [m.googleBusinessPostId, m.instagramPostId])
  );

  const results = await Promise.all(
    locationIds.map((locationId) =>
      realGoogle.fetchRealGoogleBusinessPosts(locationId, postNameToInstagramId)
    )
  );

  return results
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getConnectionStatus() {
  const [instagram, google] = await Promise.all([
    getConnection("instagram"),
    getConnection("google"),
  ]);
  return {
    instagram: instagram
      ? { connected: true as const, label: instagram.externalLabel }
      : { connected: false as const },
    google: google
      ? { connected: true as const, label: google.externalLabel }
      : { connected: false as const },
  };
}
