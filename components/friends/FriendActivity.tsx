"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Headphones } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useMusicPlayer } from "@/components/music-player/MusicPlayerProvider";
import type { Friendship } from "@/types/friendship";
import type { Profile } from "@/types/profile";
import type { ListeningPresence } from "@/types/presence";

type PublicProfile = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
const supabase = createSupabaseBrowserClient();

function ActivityButton({ children, onClick, disabled = false, tone = "brand" }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: "brand" | "quiet" }) {
  const toneClass = tone === "brand"
    ? "bg-[var(--orange)] text-white hover:bg-[var(--orange-dark)]"
    : "border border-[#d9d1c5] text-[var(--ink-muted)] hover:border-[var(--orange)] hover:text-[var(--orange-dark)]";
  return <button className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`} disabled={disabled} onClick={onClick} type="button">{children}</button>;
}

function Avatar({ profile }: { profile?: PublicProfile }) {
  const initials = (profile?.display_name || profile?.username || "?").slice(0, 1).toUpperCase();
  if (profile?.avatar_url) {
    return <img alt="" className="size-10 shrink-0 rounded-full object-cover" src={profile.avatar_url} />;
  }
  return <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f8c7b5] font-display text-sm font-bold text-[var(--orange-dark)]">{initials}</div>;
}

function Artwork({ url, large = false }: { url: string | null | undefined; large?: boolean }) {
  return <div className={`${large ? "aspect-square w-full" : "size-14 shrink-0"} overflow-hidden rounded-xl bg-[#eee5d8]`}>
    {url ? <img alt="" className="h-full w-full object-cover" src={url} /> : <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-[#d4c5b2]">m.</div>}
  </div>;
}

function isFresh(presence: ListeningPresence, now: number) {
  return presence.is_online && now - new Date(presence.updated_at).getTime() <= 60_000;
}

function StatusLabel({ online, children }: { online: boolean; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 ${online ? "text-[#3f8755]" : "text-[var(--ink-muted)]"}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${online ? "bg-[#3f8755]" : "bg-[#a39b90]"}`} />{children}</span>;
}

export default function FriendActivity({ userId, friendships, profiles, visualCards = false }: { userId: string; friendships: Friendship[]; profiles: PublicProfile[]; visualCards?: boolean }) {
  const { track, currentTime, joinTrack, pausePlayback, resumePlayback, syncPosition, followingUserId, followingUsername, followSession, leaveSession } = useMusicPlayer();
  const [presence, setPresence] = useState<Record<string, ListeningPresence>>({});
  const [now, setNow] = useState(() => Date.now());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const followingUserIdRef = useRef<string | null>(null);
  const followedTrackIdRef = useRef<string | null>(null);
  const trackRef = useRef(track);
  const currentTimeRef = useRef(currentTime);
  // Guards against a realtime event that arrives out of order (e.g. a delayed
  // duplicate of an older row state) from ever being applied after a newer one.
  const lastAppliedUpdatedAtRef = useRef<string | null>(null);
  const friendIds = friendships.filter((item) => item.status === "accepted").map((item) => item.requester_id === userId ? item.addressee_id : item.requester_id);
  const friendKey = friendIds.slice().sort().join(",");

  useEffect(() => {
    trackRef.current = track;
    currentTimeRef.current = currentTime;
  }, [track, currentTime]);

  useEffect(() => {
    followingUserIdRef.current = followingUserId;
    if (!followingUserId) {
      followedTrackIdRef.current = null;
      lastAppliedUpdatedAtRef.current = null;
    }
  }, [followingUserId]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const currentFriendIds = friendKey ? friendKey.split(",") : [];
    if (currentFriendIds.length === 0) {
      queueMicrotask(() => setPresence({}));
      return;
    }

    const channel = supabase.channel(`friend-listening-${userId}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "listening_presence" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedUserId = (payload.old as Partial<ListeningPresence>).user_id;
          if (deletedUserId && currentFriendIds.includes(deletedUserId)) {
            setPresence((current) => { const copy = { ...current }; delete copy[deletedUserId]; return copy; });
          }
          return;
        }
        const next = payload.new as ListeningPresence;
        if (!currentFriendIds.includes(next.user_id)) return;
        setPresence((current) => ({ ...current, [next.user_id]: next }));

        const isFollowingHost = followingUserId === next.user_id || followingUserIdRef.current === next.user_id;
        if (!isFollowingHost || !next.track_id) return;

        // Drop anything older than (or equal to) the last update we actually
        // applied for this host — the row's own updated_at is monotonic per
        // write, so this is enough to ignore a stray reordered delivery.
        if (lastAppliedUpdatedAtRef.current && next.updated_at <= lastAppliedUpdatedAtRef.current) return;
        lastAppliedUpdatedAtRef.current = next.updated_at;

        const fresh = isFresh(next, Date.now());
        const elapsed = next.is_playing && fresh ? Math.max(0, (Date.now() - new Date(next.updated_at).getTime()) / 1000) : 0;
        const remotePosition = Number(next.position_seconds) + elapsed;
        if (next.track_id !== trackRef.current?.id) {
          followedTrackIdRef.current = next.track_id;
          void joinTrack(next.track_id, remotePosition, next.is_playing && fresh);
        } else if (next.is_playing && fresh) {
          if (Math.abs(currentTimeRef.current - remotePosition) > 5) syncPosition(remotePosition);
          void resumePlayback();
        } else {
          pausePlayback();
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setPresenceError("Live updates are momentarily unavailable. Reconnecting...");
        if (status === "SUBSCRIBED") setPresenceError(null);
      });

    const loadPresence = async () => {
      const { data, error } = await supabase.from("listening_presence").select("*").in("user_id", currentFriendIds);
      if (error) setPresenceError("Couldn't load friend activity right now.");
      else if (data) setPresence(Object.fromEntries((data as ListeningPresence[]).map((item) => [item.user_id, item])));
    };
    void loadPresence();
    return () => { void supabase.removeChannel(channel); };
  }, [friendKey, userId, followingUserId]);

  useEffect(() => {
    if (followingUserIdRef.current && track?.id && followedTrackIdRef.current && track.id !== followedTrackIdRef.current) {
      followingUserIdRef.current = null;
      leaveSession();
      followedTrackIdRef.current = null;
    }
  }, [track?.id]);

  const profileById = (id: string) => profiles.find((profile) => profile.id === id);
  const join = async (item: ListeningPresence) => {
    if (!item.track_id) return;
    setJoiningId(item.user_id);
    const elapsed = item.is_playing && isFresh(item, now) ? Math.max(0, (now - new Date(item.updated_at).getTime()) / 1000) : 0;
    const joined = await joinTrack(item.track_id, Number(item.position_seconds) + elapsed, item.is_playing && isFresh(item, now));
    if (joined) {
      followingUserIdRef.current = item.user_id;
      followedTrackIdRef.current = item.track_id;
      lastAppliedUpdatedAtRef.current = item.updated_at;
      followSession(item.user_id, profiles.find((profile) => profile.id === item.user_id)?.username ?? "friend");
    }
    setJoiningId(null);
  };

  return <div className="mt-8">
    <div className="mb-4 flex items-center gap-2">
      <h2 className="font-display text-lg font-bold tracking-[-0.03em]">Listening now</h2>
      <span className="rounded-full bg-[#eadfd3] px-2 py-0.5 text-xs font-bold text-[var(--ink-muted)]">{friendIds.length}</span>
    </div>
    {presenceError ? <p className="mb-3 text-xs text-[var(--orange-dark)]">{presenceError}</p> : null}
    {friendIds.length === 0
      ? <p className="text-sm text-[var(--ink-muted)]">Add friends to see what they are listening to.</p>
      : <div className="grid gap-3 sm:grid-cols-2">
          {friendIds.map((friendId) => {
            const profile = profileById(friendId);
            const item = presence[friendId];
            const online = item ? isFresh(item, now) : false;
            const listening = online && Boolean(item?.track_id);
            const isThisFriendFollowed = followingUserId === friendId;
            const isJoining = joiningId === friendId;

            if (visualCards) return <div className="overflow-hidden rounded-2xl border border-[#e5ddd2] bg-[#fbf8f3] p-3 sm:p-4" key={friendId}>
              {listening && item ? <>
                <Artwork large url={item.artwork_url} />
                <div className="mt-3 flex items-center gap-3">
                  <Avatar profile={profile} />
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">@{profile?.username ?? "friend"}</p><p className="truncate text-xs font-semibold"><StatusLabel online={online}>{online ? "Listening now" : "Offline"}</StatusLabel></p></div>
                </div>
                <div className="mt-3 min-w-0"><p className="truncate font-display text-lg font-bold">{item.track_title ?? "Unknown track"}</p><p className="truncate text-sm text-[var(--ink-muted)]">{item.artist_name ?? "Unknown artist"} · {item.is_playing ? "Playing" : "Paused"}</p></div>
                <div className="mt-4">{isThisFriendFollowed ? <div className="flex items-center justify-between gap-2"><span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-bold uppercase tracking-[0.08em] text-[var(--orange-dark)]"><Headphones aria-hidden="true" size={14} strokeWidth={2} />Listening with @{followingUsername}</span><ActivityButton onClick={leaveSession} tone="quiet">LEAVE SESSION</ActivityButton></div> : <ActivityButton disabled={isJoining || (followingUserId !== null)} onClick={() => void join(item)}>{isJoining ? "JOINING..." : <><Headphones aria-hidden="true" size={14} strokeWidth={2} />JOIN</>}</ActivityButton>}</div>
              </> : <div className="flex items-center gap-3"><Avatar profile={profile} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">@{profile?.username ?? "friend"}</p><p className="truncate text-xs font-semibold"><StatusLabel online={online}>{online ? "Online" : "Offline"}</StatusLabel></p><p className="mt-2 text-xs text-[var(--ink-muted)]">{online ? "Not listening right now" : "Offline"}</p></div></div>}
            </div>;

            return <div className="flex items-start gap-3 rounded-2xl border border-[#e5ddd2] bg-[#fbf8f3] p-3" key={friendId}>
              <Avatar profile={profile} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">@{profile?.username ?? "friend"}</span>
                  <span className={`shrink-0 text-xs font-semibold ${online ? "text-[#3f8755]" : "text-[var(--ink-muted)]"}`}>
                    <StatusLabel online={online}>{online ? (listening ? "Listening now" : "Online") : "Offline"}</StatusLabel>
                  </span>
                </div>

                {listening && item ? <>
                  <div className="mt-2 flex items-center gap-3">
                    <Artwork url={item.artwork_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.track_title ?? "Unknown track"}</p>
                      <p className="truncate text-xs text-[var(--ink-muted)]">{item.artist_name ?? "Unknown artist"} · {item.is_playing ? "Playing" : "Paused"}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {isThisFriendFollowed
                      ? <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-bold uppercase tracking-[0.08em] text-[var(--orange-dark)]"><Headphones aria-hidden="true" size={14} strokeWidth={2} />Listening with @{followingUsername}</span>
                          <ActivityButton onClick={leaveSession} tone="quiet">LEAVE SESSION</ActivityButton>
                        </div>
                      : <ActivityButton disabled={isJoining || (followingUserId !== null)} onClick={() => void join(item)}>
                          {isJoining ? "JOINING..." : <><Headphones aria-hidden="true" size={14} strokeWidth={2} />JOIN</>}
                        </ActivityButton>}
                  </div>
                </> : <p className="mt-2 text-xs text-[var(--ink-muted)]">{online ? "Not listening right now" : "Offline"}</p>}
              </div>
            </div>;
          })}
        </div>}
  </div>;
}
