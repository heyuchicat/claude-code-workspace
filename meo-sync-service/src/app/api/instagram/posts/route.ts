import { NextResponse } from "next/server";
import { fetchInstagramPosts } from "@/lib/data-source";
import { store } from "@/lib/store";

export async function GET() {
  const posts = await fetchInstagramPosts();
  const links = await store.listLinkMappings();

  const withStatus = posts.map((post) => ({
    ...post,
    link: links.find((l) => l.instagramPostId === post.id) ?? null,
  }));

  return NextResponse.json({ posts: withStatus });
}
