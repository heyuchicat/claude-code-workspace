// mock と 実API(OAuth連携済みの場合)を切り替えるファサード。
// 各providerが接続済み(Connectionレコードあり)なら実APIを、
// 未接続ならデモ用のmockデータを使う。すべて店舗(businessId)単位。

import { getConnection } from "./connections";
import { GoogleBusinessLocation, GoogleBusinessPost, GoogleReview, InsightsSummary, InstagramAccount, InstagramPost, QAEntry } from "./types";
import * as mockInstagram from "./mock-instagram";
import * as mockGoogle from "./mock-google-business";
import * as mockReviews from "./mock-reviews";
import * as mockInsights from "./mock-insights";
import * as mockQa from "./mock-qa";
import * as realInstagram from "./instagram-client";
import * as realGoogle from "./google-business-client";
import * as realReviews from "./google-reviews-client";
import * as realInsights from "./google-insights-client";
import * as realQa from "./google-qa-client";
import { store } from "./store";
import { logReviewReply } from "./review-store";
import { logQaAnswer } from "./qa-store";
import type { CreateGoogleBusinessPostInput } from "./mock-google-business";

export type { CreateGoogleBusinessPostInput };

async function isConnected(
  businessId: string,
  provider: "instagram" | "google"
): Promise<boolean> {
  return (await getConnection(businessId, provider)) !== null;
}

export async function fetchInstagramAccount(
  businessId: string
): Promise<InstagramAccount> {
  if (await isConnected(businessId, "instagram")) {
    return realInstagram.fetchRealInstagramAccount(businessId);
  }
  return mockInstagram.fetchInstagramAccount();
}

export async function fetchInstagramPosts(
  businessId: string
): Promise<InstagramPost[]> {
  if (await isConnected(businessId, "instagram")) {
    return realInstagram.fetchRealInstagramPosts(businessId);
  }
  return mockInstagram.fetchInstagramPosts();
}

export async function fetchInstagramPostById(
  businessId: string,
  id: string
): Promise<InstagramPost | undefined> {
  if (await isConnected(businessId, "instagram")) {
    return realInstagram.fetchRealInstagramPostById(businessId, id);
  }
  return mockInstagram.fetchInstagramPostById(id);
}

export async function fetchGoogleBusinessLocations(
  businessId: string
): Promise<GoogleBusinessLocation[]> {
  if (await isConnected(businessId, "google")) {
    return realGoogle.fetchRealGoogleBusinessLocations(businessId);
  }
  return mockGoogle.fetchGoogleBusinessLocations();
}

export async function createGoogleBusinessPost(
  businessId: string,
  input: CreateGoogleBusinessPostInput
): Promise<GoogleBusinessPost> {
  if (await isConnected(businessId, "google")) {
    return realGoogle.createRealGoogleBusinessPost(businessId, input);
  }
  return mockGoogle.createGoogleBusinessPost(input);
}

export async function fetchGoogleBusinessPosts(
  businessId: string
): Promise<GoogleBusinessPost[]> {
  if (!(await isConnected(businessId, "google"))) {
    return mockGoogle.fetchGoogleBusinessPosts();
  }

  const mappings = await store.listLinkMappings(businessId);
  const locationIds = [...new Set(mappings.map((m) => m.locationId))];
  const postNameToInstagramId = new Map(
    mappings.map((m) => [m.googleBusinessPostId, m.instagramPostId])
  );

  const results = await Promise.all(
    locationIds.map((locationId) =>
      realGoogle.fetchRealGoogleBusinessPosts(
        businessId,
        locationId,
        postNameToInstagramId
      )
    )
  );

  return results
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function fetchReviews(
  businessId: string,
  locationId: string
): Promise<GoogleReview[]> {
  if (await isConnected(businessId, "google")) {
    return realReviews.fetchRealReviews(businessId, locationId);
  }
  return mockReviews.fetchReviews();
}

export async function replyToReview(
  businessId: string,
  locationId: string,
  reviewId: string,
  replyText: string
): Promise<void> {
  if (await isConnected(businessId, "google")) {
    await realReviews.replyToRealReview(businessId, locationId, reviewId, replyText);
  } else {
    await mockReviews.replyToReview(reviewId, replyText);
  }
  await logReviewReply(businessId, locationId, reviewId, replyText);
}

export async function fetchInsights(
  businessId: string,
  locationId: string
): Promise<InsightsSummary> {
  if (await isConnected(businessId, "google")) {
    return realInsights.fetchRealInsights(businessId, locationId);
  }
  return mockInsights.fetchInsights(locationId);
}

export async function fetchQA(
  businessId: string,
  locationId: string
): Promise<QAEntry[]> {
  if (await isConnected(businessId, "google")) {
    return realQa.fetchRealQuestions(businessId, locationId);
  }
  return mockQa.fetchQuestions();
}

export async function answerQuestion(
  businessId: string,
  locationId: string,
  questionId: string,
  question: string,
  answerText: string
): Promise<void> {
  if (await isConnected(businessId, "google")) {
    await realQa.answerRealQuestion(businessId, questionId, answerText);
  } else {
    await mockQa.answerQuestion(questionId, answerText);
  }
  await logQaAnswer(businessId, locationId, questionId, question, answerText);
}

export async function getConnectionStatus(businessId: string) {
  const [instagram, google] = await Promise.all([
    getConnection(businessId, "instagram"),
    getConnection(businessId, "google"),
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
