"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMusicPlayer } from "@/components/music-player/MusicPlayerProvider";
import type { AudiusTrack } from "@/types/audius";

const formatTime = (seconds = 0) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
};

function Artwork({ track }: { track: AudiusTrack }) {
  const artwork = track.artwork?.["480x480"] ?? track.artwork?.["150x150"];
  return <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-[#eee5d8] sm:size-16">
    {artwork ? <img alt="" className="h-full w-full object-cover" src={artwork} /> : <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-[#d4c5b2]">m.</div>}
  </div>;
}

export default function MusicDiscovery() {
  const { track: currentTrack, isPlaying, isLoading: isPlayerLoading, playTrack, setAvailableTrackIds, followingUserId } = useMusicPlayer();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailableTrackIds(tracks.map((item) => item.id));
  }, [setAvailableTrackIds, tracks]);

  useEffect(() => {
    const loadTrending = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch("/api/audius/trending/list", { cache: "no-store" });
        const data = (await response.json()) as AudiusTrack[] & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load trending music.");
        setTracks(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load trending music.");
      } finally { setIsLoading(false); }
    };
    void loadTrending();
  }, []);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (nextQuery.length < 2) return;
    setSubmittedQuery(nextQuery); setIsLoading(true); setError(null);
    try {
      const response = await fetch(`/api/audius/search?q=${encodeURIComponent(nextQuery)}`, { cache: "no-store" });
      const data = (await response.json()) as AudiusTrack[] & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Couldn't search right now.");
      setTracks(data);
    } catch (searchError) {
      setTracks([]);
      setError(searchError instanceof Error ? searchError.message : "Couldn't search right now.");
    } finally { setIsLoading(false); }
  };

  const clearSearch = () => {
    setQuery(""); setSubmittedQuery(""); setError(null); setIsLoading(true);
    void fetch("/api/audius/trending/list", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as AudiusTrack[] & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load trending music.");
        setTracks(data);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load trending music."))
      .finally(() => setIsLoading(false));
  };

  const handlePlay = async (trackId: string) => {
    setPlayingId(trackId); setError(null);
    await playTrack(trackId);
    setPlayingId(null);
  };

  return <section className="w-full max-w-2xl rounded-[28px] border border-[#ded6ca] bg-[#fffdf9] p-5 shadow-[0_24px_70px_rgba(80,60,35,0.08)] sm:p-7">
    <div className="mb-5 flex items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Discover</p><h2 className="font-display text-3xl font-bold tracking-[-0.05em]">Music</h2></div>{submittedQuery ? <button className="text-xs font-bold text-[var(--orange-dark)] underline-offset-4 hover:underline" onClick={clearSearch} type="button">Clear search</button> : null}</div>
    <form className="flex gap-2" onSubmit={(event) => void search(event)}>
      <label className="sr-only" htmlFor="music-search">Search songs and artists</label>
      <input id="music-search" className="min-w-0 flex-1 rounded-2xl border border-[#d9d1c5] bg-[#fbf8f3] px-4 py-3 text-sm outline-none transition placeholder:text-[#a39b90] focus:border-[var(--orange)]" onChange={(event) => setQuery(event.target.value)} placeholder="Search songs, artists..." value={query} />
      <button className="shrink-0 rounded-2xl bg-[var(--orange)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--orange-dark)] disabled:cursor-not-allowed disabled:opacity-50" disabled={query.trim().length < 2 || isLoading} type="submit">Search</button>
    </form>
    <div className="mb-3 mt-7 flex items-center justify-between gap-3"><h3 className="font-display text-lg font-bold tracking-[-0.03em]">{submittedQuery ? `Results for “${submittedQuery}”` : "Trending"}</h3>{isLoading ? <span className="text-xs text-[var(--ink-muted)]">Loading...</span> : null}</div>
    {error ? <div className="rounded-2xl bg-[#fff0e8] px-4 py-3 text-sm text-[#a64220]" role="alert">{error}<button className="ml-2 font-bold underline" onClick={clearSearch} type="button">Try again</button></div> : null}
    {!isLoading && !error && tracks.length === 0 ? <p className="rounded-2xl bg-[#fbf8f3] px-4 py-8 text-center text-sm text-[var(--ink-muted)]">No music found.<br />Try another song or artist.</p> : null}
    <div className="space-y-2">
      {tracks.map((item) => {
        const isActive = currentTrack?.id === item.id;
        return <div className={`flex items-center gap-3 rounded-2xl border p-2.5 transition sm:p-3 ${isActive ? "border-[var(--orange)] bg-[#fff4ec]" : "border-[#e5ddd2] bg-[#fbf8f3]"}`} key={item.id}>
          <Artwork track={item} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title?.trim() || "Untitled track"}</p><p className="truncate text-xs text-[var(--ink-muted)]">{item.user?.name?.trim() || "Unknown artist"} · {formatTime(item.duration)}</p>{isActive ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--orange-dark)]">{isPlayerLoading ? "Loading track..." : "Playing"}</p> : null}</div>
          <button className="shrink-0 rounded-full border border-[var(--orange)] px-3 py-1.5 text-xs font-bold text-[var(--orange-dark)] transition hover:bg-[var(--orange)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={playingId !== null} onClick={() => void handlePlay(item.id)} type="button">{playingId === item.id ? "Loading..." : followingUserId ? "Leave & play" : isActive && isPlaying ? "Playing" : "Play"}</button>
        </div>;
      })}
    </div>
  </section>;
}