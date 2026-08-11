import { NextResponse } from "next/server";
import { fetchGoogleBusinessPosts } from "@/lib/data-source";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const posts = await fetchGoogleBusinessPosts(businessId);
  return NextResponse.json({ posts });
}
