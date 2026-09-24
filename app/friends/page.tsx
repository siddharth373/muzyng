"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import FriendsArea from "@/components/friends/FriendsArea";

export default function FriendsPage() {
  const { user, profile } = useAuth();

  if (!user || !profile) return <section className="mx-auto max-w-xl py-12 text-center"><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Friends</h1><p className="mt-3 text-sm text-[var(--ink-muted)]">Log in to find people and manage your circle.</p></section>;
  return <section><div className="mb-8"><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange-dark)]">Community</p><h1 className="font-display text-4xl font-bold tracking-[-0.06em]">Friends</h1><p className="mt-2 text-sm text-[var(--ink-muted)]">Find people, manage requests, and listen together.</p></div><FriendsArea userId={user.id} /></section>;
}