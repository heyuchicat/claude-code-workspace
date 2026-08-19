import { NextResponse } from "next/server";
import { fetchInstagramPosts } from "@/lib/data-source";
import { store } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const posts = await fetchInstagramPosts(businessId);
  const links = await store.listLinkMappings(businessId);

  const withStatus = posts.map((post) => ({
    ...post,
    link: links.find((l) => l.instagramPostId === post.id) ?? null,
  }));

  return NextResponse.json({ posts: withStatus });
}
