import { NextResponse } from "next/server";
import { getPlayableTrack } from "@/lib/audius/tracks";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getPlayableTrack(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load the Audius track." }, { status: 502 });
  }
}