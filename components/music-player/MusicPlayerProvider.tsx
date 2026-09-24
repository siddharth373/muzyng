"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { PlayerTrack } from "@/types/audius";

type MusicPlayerContextValue = {
  track: PlayerTrack | null;
  currentTime: number;
  duration: number;
  volume: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  setVolume: (value: number) => void;
  setAvailableTrackIds: (trackIds: string[]) => void;
  playTrack: (trackId: string) => Promise<boolean>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  togglePlayback: () => Promise<void>;
  seek: (value: number) => void;
  joinTrack: (trackId: string, position: number, shouldPlay: boolean) => Promise<boolean>;
  pausePlayback: () => void;
  resumePlayback: () => Promise<void>;
  syncPlayback: (shouldPlay: boolean) => Promise<void>;
  syncPosition: (value: number) => void;
  seekRevision: number;
  followingUserId: string | null;
  followingUsername: string | null;
  followSession: (userId: string, username: string) => void;
  leaveSession: () => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const availableTrackIdsRef = useRef<string[]>([]);
  const playedTrackIdsRef = useRef<string[]>([]);
  const skipHistoryRef = useRef(false);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seekRevision, setSeekRevision] = useState(0);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [followingUsername, setFollowingUsername] = useState<string | null>(null);

  const leaveSession = () => {
    setFollowingUserId(null);
    setFollowingUsername(null);
  };

  const followSession = (userId: string, username: string) => {
    setFollowingUserId(userId);
    setFollowingUsername(username);
  };

  const setAvailableTrackIds = (trackIds: string[]) => {
    availableTrackIdsRef.current = [...new Set(trackIds)];
  };

  const playTrack = async (trackId: string) => {
    leaveSession();
    setIsLoading(true); setError(null); setIsPlaying(false);
    try {
      const response = await fetch(`/api/audius/tracks/${encodeURIComponent(trackId)}`, { cache: "no-store" });
      const data = (await response.json()) as PlayerTrack & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load that track.");
      if (!skipHistoryRef.current && currentTrackIdRef.current && currentTrackIdRef.current !== data.id) {
        playedTrackIdsRef.current = [...playedTrackIdsRef.current.filter((id) => id !== currentTrackIdRef.current), currentTrackIdRef.current];
      }
      skipHistoryRef.current = false;
      currentTrackIdRef.current = data.id;
      setTrack(data); setCurrentTime(0); setDuration(data.duration);
      const audio = audioRef.current;
      if (!audio) return false;
      audio.pause();
      audio.src = data.streamUrl;
      audio.load();
      await new Promise<void>((resolve, reject) => {
        const onReady = () => { cleanup(); resolve(); };
        const onFailure = () => { cleanup(); reject(new Error("This track could not be loaded.")); };
        const cleanup = () => {
          audio.removeEventListener("canplay", onReady);
          audio.removeEventListener("error", onFailure);
        };
        audio.addEventListener("canplay", onReady, { once: true });
        audio.addEventListener("error", onFailure, { once: true });
        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onReady();
      });
      await audio.play();
      return true;
    } catch (playError) {
      skipHistoryRef.current = false;
      setError(playError instanceof Error ? playError.message : "Could not play that track.");
      return false;
    } finally { setIsLoading(false); }
  };

  const previousTrack = async () => {
    if (!track) return;
    const previousId = playedTrackIdsRef.current.pop();
    if (!previousId) {
      seek(0);
      return;
    }
    skipHistoryRef.current = true;
    await playTrack(previousId);
  };

  const nextTrack = async () => {
    if (!track) return;
    const currentIndex = availableTrackIdsRef.current.indexOf(track.id);
    const nextId = currentIndex >= 0 ? availableTrackIdsRef.current[currentIndex + 1] : availableTrackIdsRef.current[0];
    if (nextId) await playTrack(nextId);
  };

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      try { await audio.play(); } catch { setError("The browser blocked playback. Press play again to start."); }
    } else audio.pause();
  };

  const pausePlayback = () => {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
    setIsPlaying(false);
  };

  const resumePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      try { await audio.play(); } catch { setError("The browser blocked playback. Press play again to start."); }
    }
  };

  const syncPlayback = async (shouldPlay: boolean) => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (!shouldPlay) {
      if (!audio.paused) audio.pause();
      return;
    }
    if (audio.paused) {
      try { await audio.play(); } catch { setError("The browser blocked playback. Press play again to start."); }
    }
  };

  const seek = (value: number) => { if (audioRef.current) audioRef.current.currentTime = value; setSeekRevision((revision) => revision + 1); };

  const joinTrack = async (trackId: string, position: number, shouldPlay: boolean) => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`/api/audius/tracks/${encodeURIComponent(trackId)}`, { cache: "no-store" });
      const data = (await response.json()) as PlayerTrack & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load that track.");
      currentTrackIdRef.current = data.id;
      setTrack(data); setDuration(data.duration); setCurrentTime(Math.max(0, Math.min(position, data.duration || position))); setIsPlaying(false);
      const audio = audioRef.current;
      if (!audio) return false;
      audio.pause();
      audio.src = data.streamUrl;
      audio.load();
      await new Promise<void>((resolve, reject) => {
        const onReady = () => { cleanup(); resolve(); };
        const onFailure = () => { cleanup(); reject(new Error("This track could not be loaded.")); };
        const cleanup = () => {
          audio.removeEventListener("canplay", onReady);
          audio.removeEventListener("error", onFailure);
        };
        audio.addEventListener("canplay", onReady, { once: true });
        audio.addEventListener("error", onFailure, { once: true });
        if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onReady();
      });
      audio.currentTime = Math.max(0, Math.min(position, data.duration || position));
      if (shouldPlay) await audio.play();
      return true;
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not join that track.");
      return false;
    } finally { setIsLoading(false); }
  };

  return <MusicPlayerContext.Provider value={{ track, currentTime, duration, volume, isPlaying, isLoading, error, setVolume, setAvailableTrackIds, playTrack, previousTrack, nextTrack, togglePlayback, pausePlayback, resumePlayback, syncPlayback, seek, syncPosition: seek, joinTrack, seekRevision, followingUserId, followingUsername, followSession, leaveSession }}>
    {children}
    <audio ref={audioRef} src={track?.streamUrl ?? undefined} onCanPlay={() => setIsLoading(false)} onDurationChange={(event) => setDuration(event.currentTarget.duration)} onEnded={() => setIsPlaying(false)} onError={() => { setIsPlaying(false); setError("This track could not be streamed. Try another track."); }} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onPause={() => setIsPlaying(false)} onPlay={() => { setError(null); setIsPlaying(true); }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} preload="metadata" />
  </MusicPlayerContext.Provider>;
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  return context;
}