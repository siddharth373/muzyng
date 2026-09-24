import { NextResponse } from "next/server";
import { searchTracks } from "@/lib/audius/tracks";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ error: "Search for at least two characters." }, { status: 400 });

  try {
    return NextResponse.json(await searchTracks(query), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search Audius." }, { status: 502 });
  }
}