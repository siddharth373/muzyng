"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useMusicPlayer } from "@/components/music-player/MusicPlayerProvider";

const supabase = createSupabaseBrowserClient();

export default function PresenceSync({ userId }: { userId: string }) {
  const { track, currentTime, isPlaying, seekRevision } = useMusicPlayer();
  const currentTimeRef = useRef(currentTime);
  const stateRef = useRef({ track, isPlaying });

  // Every publish attempt (the 7s heartbeat, an immediate state-change publish,
  // or the offline beacon) shares this controller so that starting a new write
  // always cancels whichever previous one is still in flight. Without this,
  // the heartbeat could still be waiting on a slow network response carrying a
  // stale "is_playing: true" payload; if that response happened to land on the
  // server *after* a just-issued "is_playing: false" write (ordinary network
  // jitter, no clock skew required), it would silently revert the row back to
  // "playing" and any friend following would see their audio resume even
  // though the host had genuinely paused. Aborting the older request removes
  // that race outright instead of trying to detect it after the fact.
  const inFlightControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    currentTimeRef.current = currentTime;
    stateRef.current = { track, isPlaying };
  }, [currentTime, track, isPlaying]);

  const write = (payload: { is_online: boolean; is_playing: boolean }) => {
    if (!supabase) return;
    inFlightControllerRef.current?.abort();
    const controller = new AbortController();
    inFlightControllerRef.current = controller;
    const request = supabase
      .from("listening_presence")
      .upsert({
        user_id: userId,
        is_online: payload.is_online,
        track_id: stateRef.current.track?.id ?? null,
        track_title: stateRef.current.track?.title ?? null,
        artist_name: stateRef.current.track?.artist ?? null,
        artwork_url: stateRef.current.track?.artworkUrl ?? null,
        is_playing: stateRef.current.track ? payload.is_playing : false,
        position_seconds: currentTimeRef.current,
      }, { onConflict: "user_id" })
      .abortSignal(controller.signal);
    const clear = () => { if (inFlightControllerRef.current === controller) inFlightControllerRef.current = null; };
    void Promise.resolve(request).then(clear, clear);
  };

  // Heartbeat: keeps position_seconds fresh for anyone following while playing,
  // publishes once on mount, and marks the user offline on unmount / tab close.
  useEffect(() => {
    if (!supabase) return;
    write({ is_online: true, is_playing: stateRef.current.isPlaying });
    const interval = window.setInterval(() => {
      if (stateRef.current.isPlaying) write({ is_online: true, is_playing: true });
    }, 7000);
    const markOffline = () => write({ is_online: false, is_playing: false });
    window.addEventListener("pagehide", markOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", markOffline);
      write({ is_online: false, is_playing: false });
    };
    // write() is stable in behavior across renders (reads via refs) even though
    // its identity is not memoized; only userId should re-run this setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Publish immediately whenever something a follower needs to react to
  // changes: track, play/pause, or a manual seek. Goes through the same
  // `write` path above, so it always supersedes a stale heartbeat in flight.
  useEffect(() => {
    write({ is_online: true, is_playing: isPlaying });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, track?.id, track?.title, track?.artist, track?.artworkUrl, isPlaying, seekRevision]);

  return null;
}
