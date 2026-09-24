import { NextResponse } from "next/server";
import { getTrendingTracks } from "@/lib/audius/tracks";

export async function GET() {
  try {
    return NextResponse.json(await getTrendingTracks(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load trending music." }, { status: 502 });
  }
}