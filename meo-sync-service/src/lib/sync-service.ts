import {
  fetchInstagramPostById,
  fetchInstagramPosts,
  createGoogleBusinessPost,
} from "./data-source";
import { store } from "./store";
import { LinkMapping } from "./types";

// Instagram投稿を「紐づけ」て Google ビジネスプロフィールの投稿として反映するコア処理。
// caption(160文字目安)を要約し、投稿画像をそのままGoogle側のローカル投稿として作成する。

const GOOGLE_POST_MAX_LENGTH = 1500;

function buildSummary(caption: string): string {
  const trimmed = caption.trim();
  if (trimmed.length <= GOOGLE_POST_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, GOOGLE_POST_MAX_LENGTH - 1)}…`;
}

export class AlreadyLinkedError extends Error {
  constructor(instagramPostId: string) {
    super(`Instagram post ${instagramPostId} is already linked.`);
    this.name = "AlreadyLinkedError";
  }
}

export async function linkInstagramPostToGoogle(
  businessId: string,
  instagramPostId: string,
  locationId: string
): Promise<LinkMapping> {
  const existing = await store.findLinkByInstagramPostId(businessId, instagramPostId);
  if (existing) {
    throw new AlreadyLinkedError(instagramPostId);
  }

  const igPost = await fetchInstagramPostById(businessId, instagramPostId);
  if (!igPost) {
    throw new Error(`Instagram post not found: ${instagramPostId}`);
  }

  const googlePost = await createGoogleBusinessPost(businessId, {
    locationId,
    summary: buildSummary(igPost.caption),
    mediaUrl: igPost.mediaUrl,
    sourceInstagramPostId: igPost.id,
  });

  const mapping: LinkMapping = {
    instagramPostId: igPost.id,
    googleBusinessPostId: googlePost.id,
    locationId,
    linkedAt: new Date().toISOString(),
  };
  await store.addLinkMapping(businessId, mapping);

  return mapping;
}

// 未連携のInstagram投稿をすべて指定ロケーションへ一括同期する。
export async function syncAllUnlinkedPosts(businessId: string, locationId: string) {
  const posts = await fetchInstagramPosts(businessId);
  const results: { instagramPostId: string; ok: boolean; error?: string }[] =
    [];

  for (const post of posts) {
    if (await store.findLinkByInstagramPostId(businessId, post.id)) continue;
    try {
      await linkInstagramPostToGoogle(businessId, post.id, locationId);
      results.push({ instagramPostId: post.id, ok: true });
    } catch (err) {
      results.push({
        instagramPostId: post.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
