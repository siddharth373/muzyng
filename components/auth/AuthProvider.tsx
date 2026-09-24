"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Profile } from "@/types/profile";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const supabase = createSupabaseBrowserClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      return () => { isMounted = false; };
    }

    const loadProfile = async (nextUser: User | null) => {
      if (!nextUser) {
        if (isMounted) setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", nextUser.id).maybeSingle();
      if (isMounted) setProfile(data as Profile | null);
    };

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      if (!isMounted) return;
      setUser(nextUser);
      await loadProfile(nextUser);
      if (isMounted) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      if (!isMounted) return;
      setUser(nextUser);
      if (event === "SIGNED_OUT") setProfile(null);
      else void loadProfile(nextUser);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}