import { NextResponse } from "next/server";
import { fetchGoogleBusinessPosts } from "@/lib/data-source";

export async function GET() {
  const posts = await fetchGoogleBusinessPosts();
  return NextResponse.json({ posts });
}
