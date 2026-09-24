"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const minimumPasswordLength = 8;

type ResetState = "checking" | "ready" | "expired" | "success";

export default function ResetPasswordForm() {
  const [state, setState] = useState<ResetState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setError("We couldn't verify this reset link right now. Please request a new one.");
        setState("expired");
      });
      return () => { isMounted = false; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (isMounted && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) setState("ready");
    });

    const prepare = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState({}, "", "/reset-password");
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) setState(session ? "ready" : "expired");
      } catch {
        if (isMounted) {
          setError("This password reset link is no longer valid. Request a new one.");
          setState("expired");
        }
      }
    };

    void prepare();
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < minimumPasswordLength) {
      setError(`Password must be at least ${minimumPasswordLength} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmPassword("");
      setState("success");
    } catch {
      setError("We couldn't update your password right now. Please request a new reset link and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center px-5 py-10">
    <section className="w-full max-w-[430px] rounded-[28px] border border-[#ded6ca] bg-[#fffdf9] p-6 shadow-[0_24px_70px_rgba(80,60,35,0.11)] sm:p-8">
      <Link href="/" className="font-display text-xl font-bold tracking-[-0.04em]">muzyng<span className="text-[var(--orange)]">.</span></Link>
      {state === "checking" && <div className="mb-8 mt-10"><p className="text-sm text-[var(--ink-muted)]">Checking your reset link...</p></div>}
      {state === "expired" && <div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Password reset</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Reset link expired</h1><p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">{error ?? "This password reset link is no longer valid. Request a new one."}</p><Link className="mt-8 block w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--orange-dark)]" href="/forgot-password">Request a new reset link</Link></div>}
      {state === "success" && <div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">All set</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Password updated successfully.</h1><Link className="mt-8 block w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--orange-dark)]" href="/login">Go to login</Link></div>}
      {state === "ready" && <><div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Password reset</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Choose a new password</h1><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Use at least {minimumPasswordLength} characters.</p></div><form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}><label className="block"><span className="mb-2 block text-sm font-semibold">New password</span><input autoComplete="new-password" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label><label className="block"><span className="mb-2 block text-sm font-semibold">Confirm new password</span><input autoComplete="new-password" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} /></label>{error && <p className="rounded-xl bg-[#fff0e8] px-3 py-2 text-sm leading-5 text-[#a64220]" role="alert">{error}</p>}<button className="w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--orange-dark)] disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Updating..." : "Update password"}</button></form></>}
    </section>
  </main>;
}
