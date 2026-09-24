"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Friendship } from "@/types/friendship";
import type { Profile } from "@/types/profile";
import FriendActivity from "@/components/friends/FriendActivity";

type PublicProfile = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

const supabase = createSupabaseBrowserClient();

function getInitials(profile: PublicProfile) {
  return (profile.display_name || profile.username).slice(0, 1).toUpperCase();
}

function ProfileChip({ profile }: { profile: PublicProfile }) {
  return <div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f8c7b5] font-display text-sm font-bold text-[var(--orange-dark)]">{getInitials(profile)}</div><span className="truncate font-semibold">@{profile.username}</span></div>;
}

function ActionButton({ children, onClick, disabled = false, subtle = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; subtle?: boolean }) {
  return <button className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${subtle ? "border border-[#d9d1c5] text-[var(--ink-muted)] hover:border-[var(--orange)] hover:text-[var(--orange-dark)]" : "bg-[var(--orange)] text-white hover:bg-[var(--orange-dark)]"} disabled:cursor-not-allowed disabled:opacity-50`} onClick={onClick} disabled={disabled} type="button">{children}</button>;
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return <div className="mb-4 flex items-center gap-2"><h2 className="font-display text-lg font-bold tracking-[-0.03em]">{title}</h2>{count !== undefined ? <span className="rounded-full bg-[#eadfd3] px-2 py-0.5 text-xs font-bold text-[var(--ink-muted)]">{count}</span> : null}</div>;
}

function FriendSearch({ profiles, relationships, onSend, onAccept, busyId }: { profiles: PublicProfile[]; relationships: Friendship[]; onSend: (profileId: string) => void; onAccept: (relationship: Friendship) => void; busyId: string | null }) {
  const getAction = (profileId: string) => {
    const relationship = relationships.find((item) => item.requester_id === profileId || item.addressee_id === profileId);
    if (!relationship) return "Add Friend";
    if (relationship.status === "accepted") return "Friends";
    if (relationship.status === "pending") return relationship.requester_id === profileId ? "Accept" : "Request Sent";
    return "Add Friend";
  };

  return <div><label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]" htmlFor="friend-search">Find people</label><input id="friend-search" className="w-full rounded-2xl border border-[#d9d1c5] bg-[#fbf8f3] px-4 py-3 text-sm outline-none transition placeholder:text-[#a39b90] focus:border-[var(--orange)]" placeholder="Search by username" onChange={(event) => onSend(event.target.value)} /><div className="mt-3 space-y-2">{profiles.map((profile) => { const relationship = relationships.find((item) => item.requester_id === profile.id || item.addressee_id === profile.id); const action = getAction(profile.id); return <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5ddd2] bg-[#fbf8f3] px-3 py-2.5" key={profile.id}><ProfileChip profile={profile} />{action === "Friends" || action === "Request Sent" ? <span className="shrink-0 text-xs font-semibold text-[var(--ink-muted)]">{action}</span> : <ActionButton disabled={busyId === profile.id} onClick={() => action === "Accept" && relationship ? onAccept(relationship) : onSend(profile.id)}>{action}</ActionButton>}</div>; })}</div>{profiles.length === 0 ? <p className="mt-3 text-sm text-[var(--ink-muted)]">Type at least two characters to search.</p> : null}</div>;
}

export default function FriendsArea({ userId, showManagement = true }: { userId: string; showManagement?: boolean }) {
  const [relationships, setRelationships] = useState<Friendship[]>([]);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!supabase) return;
      const { data, error: queryError } = await supabase.from("friendships").select("*").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order("created_at", { ascending: false });
      if (queryError) setError(queryError.message);
      else setRelationships((data ?? []) as Friendship[]);
      setIsLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    const query = search.trim().toLowerCase().replace(/[%,_]/g, "");
    const timer = window.setTimeout(async () => {
      if (query.length < 2 || !supabase) { setProfiles([]); return; }
      const { data, error: queryError } = await supabase.from("profiles").select("id, username, display_name, avatar_url").neq("id", userId).ilike("username", `%${query}%`).order("username").limit(12);
      if (queryError) setError(queryError.message);
      else setProfiles((data ?? []) as PublicProfile[]);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, userId]);

  const mutateRelationship = async (relationship: Friendship, status: "accepted" | "rejected") => {
    if (!supabase) return;
    setBusyId(relationship.id);
    const { error: queryError } = await supabase.from("friendships").update({ status }).eq("id", relationship.id);
    if (queryError) setError(queryError.message); else setRelationships((current) => current.map((item) => item.id === relationship.id ? { ...item, status } : item));
    setBusyId(null);
  };

  const sendRequest = async (profileIdOrSearch: string) => {
    if (profileIdOrSearch.length !== 36) { setSearch(profileIdOrSearch); return; }
    if (!supabase) return;
    setBusyId(profileIdOrSearch);
    const { data, error: queryError } = await supabase.from("friendships").insert({ requester_id: userId, addressee_id: profileIdOrSearch }).select().single();
    if (queryError) setError(queryError.code === "23505" ? "You already have a relationship with this user." : queryError.message);
    else setRelationships((current) => [...current, data as Friendship]);
    setBusyId(null);
  };

  const removeFriend = async (relationshipId: string) => {
    if (!supabase) return;
    setBusyId(relationshipId);
    const { error: queryError } = await supabase.from("friendships").delete().eq("id", relationshipId);
    if (queryError) setError(queryError.message); else setRelationships((current) => current.filter((item) => item.id !== relationshipId));
    setBusyId(null);
  };

  const incoming = relationships.filter((item) => item.addressee_id === userId && item.status === "pending");
  const accepted = relationships.filter((item) => item.status === "accepted");
  const [friendProfiles, setFriendProfiles] = useState<PublicProfile[]>([]);
  const [incomingProfiles, setIncomingProfiles] = useState<PublicProfile[]>([]);

  useEffect(() => {
    const loadProfiles = async (ids: string[], setter: (profiles: PublicProfile[]) => void) => {
      if (!supabase || ids.length === 0) { setter([]); return; }
      const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
      setter((data ?? []) as PublicProfile[]);
    };
    const currentIncoming = relationships.filter((item) => item.addressee_id === userId && item.status === "pending");
    const currentAccepted = relationships.filter((item) => item.status === "accepted");
    const currentFriendIds = currentAccepted.map((item) => item.requester_id === userId ? item.addressee_id : item.requester_id);
    void loadProfiles(currentFriendIds, setFriendProfiles);
    void loadProfiles(currentIncoming.map((item) => item.requester_id), setIncomingProfiles);
  }, [relationships, userId]);

  const profileById = (id: string, source: PublicProfile[]) => source.find((profile) => profile.id === id);
  if (isLoading) return <section className="border-t border-[#d9d1c5] pt-8"><p className="text-sm text-[var(--ink-muted)]">Loading friends...</p></section>;
  if (!showManagement) return <FriendActivity userId={userId} friendships={relationships} profiles={friendProfiles} visualCards />;

  return <section className="border-t border-[#d9d1c5] pt-8"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange-dark)]">Your circle</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Friends</h1></div>{error ? <button className="text-right text-xs text-[var(--orange-dark)] hover:underline" onClick={() => setError(null)} type="button">{error}</button> : null}</div><div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-3xl border border-[#d9d1c5] bg-[#eee6db] p-5 sm:p-6"><FriendSearch profiles={profiles} relationships={relationships} onSend={sendRequest} onAccept={(relationship) => void mutateRelationship(relationship, "accepted")} busyId={busyId} /><div className="mt-8"><SectionHeading title="Incoming requests" count={incoming.length} />{incoming.length === 0 ? <p className="text-sm text-[var(--ink-muted)]">No pending requests.</p> : <div className="space-y-2">{incoming.map((request) => { const profile = profileById(request.requester_id, incomingProfiles); return profile ? <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fbf8f3] px-3 py-2.5" key={request.id}><ProfileChip profile={profile} /><div className="flex gap-2"><ActionButton disabled={busyId === request.id} onClick={() => void mutateRelationship(request, "accepted")}>Accept</ActionButton><ActionButton subtle disabled={busyId === request.id} onClick={() => void mutateRelationship(request, "rejected")}>Reject</ActionButton></div></div> : null; })}</div>}</div></div><div><SectionHeading title="Your friends" count={accepted.length} />{accepted.length === 0 ? <p className="text-sm text-[var(--ink-muted)]">Your accepted friends will appear here.</p> : <div className="space-y-2">{accepted.map((friendship) => { const friendId = friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id; const profile = profileById(friendId, friendProfiles); return profile ? <div className="flex items-center justify-between gap-3 border-b border-[#d9d1c5] py-3" key={friendship.id}><ProfileChip profile={profile} /><ActionButton subtle disabled={busyId === friendship.id} onClick={() => void removeFriend(friendship.id)}>Remove</ActionButton></div> : null; })}</div>}</div></div><FriendActivity userId={userId} friendships={relationships} profiles={friendProfiles} /></section>;
}