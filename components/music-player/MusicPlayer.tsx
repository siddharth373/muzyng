"use client";

import PlayerControls from "./PlayerControls";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import { useMusicPlayer } from "./MusicPlayerProvider";
import { SkipBack, SkipForward } from "lucide-react";

const formatTime = (seconds: number) => !Number.isFinite(seconds) || seconds < 0 ? "0:00" : `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export default function MusicPlayer() {
  const { track, currentTime, duration, volume, isPlaying, isLoading, error, setVolume, togglePlayback, seek, previousTrack, nextTrack, followingUserId, followingUsername, leaveSession } = useMusicPlayer();
  const isFollowing = followingUserId !== null;

  return <article className="animate-float-in w-full rounded-none border-0 bg-transparent p-0 shadow-none">
    <div className="grid items-center gap-3 sm:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.5fr)_auto] sm:gap-5">
      <div className="flex min-w-0 items-center gap-3"><div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#eee5d8]">{track?.artworkUrl ? <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" /> : track ? <div className="flex h-full items-center justify-center font-display text-lg font-bold text-[#d4c5b2]">m.</div> : null}{isLoading && <div className="absolute inset-0 flex items-center justify-center bg-[#eee5d8]/90 text-[10px] text-[var(--ink-muted)]">...</div>}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{track?.title ?? "No music playing"}</p><p className="truncate text-xs text-[var(--ink-muted)]">{track?.artist ?? "Search for a song to start listening"}</p>{isFollowing ? <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--orange-dark)]">With @{followingUsername}</p> : null}</div></div>
      <div className="min-w-0">{track ? <div className="space-y-2"><ProgressBar currentTime={currentTime} duration={duration} disabled={isLoading || isFollowing} onSeek={seek} /><div className="flex justify-between text-[10px] font-medium tabular-nums text-[var(--ink-muted)]"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div><div className="flex items-center justify-center gap-3"><button aria-label="Previous track or restart" className="text-[var(--ink-muted)] transition hover:text-[var(--orange-dark)] disabled:cursor-not-allowed disabled:opacity-40" disabled={isLoading || isFollowing} onClick={() => void previousTrack()} type="button"><SkipBack aria-hidden="true" size={20} strokeWidth={2} /></button>{!isFollowing ? <PlayerControls disabled={!track || isLoading} isPlaying={isPlaying} onToggle={() => void togglePlayback()} /> : <span className="px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Following host</span>}<button aria-label="Next track" className="text-[var(--ink-muted)] transition hover:text-[var(--orange-dark)] disabled:cursor-not-allowed disabled:opacity-40" disabled={isLoading || isFollowing} onClick={() => void nextTrack()} type="button"><SkipForward aria-hidden="true" size={20} strokeWidth={2} /></button></div></div> : <p className="hidden text-xs text-[var(--ink-muted)] sm:block">Choose a track from Search to start listening.</p>}</div>
      <div className="flex items-center justify-between gap-4 sm:justify-end"><VolumeControl volume={volume} onChange={setVolume} />{isFollowing ? <button className="shrink-0 text-xs font-bold text-[var(--orange-dark)] underline-offset-4 hover:underline" onClick={leaveSession} type="button">Leave</button> : null}</div>
    </div>
    {error && <p className="mt-2 rounded-xl bg-[#fff0e8] px-3 py-1.5 text-xs text-[#a64220]" role="alert">{error}</p>}
  </article>;
}