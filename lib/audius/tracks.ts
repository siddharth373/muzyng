import { audiusRequest } from "./client";
import type { AudiusTrack, PlayerTrack } from "@/types/audius";

export async function getTrendingTracks(): Promise<AudiusTrack[]> {
  return audiusRequest<AudiusTrack[]>("/tracks/trending?limit=10");
}

export async function searchTracks(query: string): Promise<AudiusTrack[]> {
  return audiusRequest<AudiusTrack[]>(`/tracks/search?query=${encodeURIComponent(query)}&limit=20`);
}

export async function getStreamUrl(trackId: string): Promise<string> {
  const baseUrl = process.env.AUDIUS_API_BASE_URL || "https://api.audius.co/v1";
  const url = new URL(`${baseUrl}/tracks/${encodeURIComponent(trackId)}/stream`);
  url.searchParams.set("app_name", process.env.AUDIUS_APP_NAME || "musyko");
  return url.toString();
}

export async function getPlayableTrack(trackId: string): Promise<PlayerTrack> {
  const track = await audiusRequest<AudiusTrack>(`/tracks/${encodeURIComponent(trackId)}`);
  if (track.is_available === false || track.streamable === false) throw new Error("This Audius track is no longer available.");
  return {
    id: track.id,
    title: track.title?.trim() || "Untitled track",
    artist: track.user?.name?.trim() || "Unknown artist",
    artworkUrl: track.artwork?.["1000x1000"] ?? track.artwork?.["480x480"] ?? track.artwork?.["150x150"] ?? null,
    duration: track.duration ?? 0,
    streamUrl: await getStreamUrl(track.id),
  };
}

