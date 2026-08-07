import { NextResponse } from "next/server";
import { fetchGoogleBusinessPosts } from "@/lib/mock-google-business";

export async function GET() {
  const posts = await fetchGoogleBusinessPosts();
  return NextResponse.json({ posts });
}
