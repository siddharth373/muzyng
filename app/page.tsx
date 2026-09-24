"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import FriendsArea from "@/components/friends/FriendsArea";

export default function HomePage() {
  const { user, profile } = useAuth();

  if (!user || !profile) return <section className="mx-auto max-w-2xl py-12 text-center sm:py-20"><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Listen together</p><h1 className="font-display text-4xl font-bold tracking-[-0.06em] sm:text-5xl">Your friends, in sync.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--ink-muted)]">Log in to see what your friends are listening to and join them in real time.</p></section>;
  return <section><div className="mb-8"><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange-dark)]">Your circle</p><h1 className="font-display text-4xl font-bold tracking-[-0.06em]">Friends listening</h1><p className="mt-2 text-sm text-[var(--ink-muted)]">See what is playing and join the moment.</p></div><FriendsArea showManagement={false} userId={user.id} /></section>;
}