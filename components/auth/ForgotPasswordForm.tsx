"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: new URL("/reset-password", siteUrl).toString(),
      });
      if (resetError) throw resetError;
      setIsSubmitted(true);
    } catch {
      setError("We couldn't send a reset link right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center px-5 py-10">
    <section className="w-full max-w-[430px] rounded-[28px] border border-[#ded6ca] bg-[#fffdf9] p-6 shadow-[0_24px_70px_rgba(80,60,35,0.11)] sm:p-8">
      <Link href="/" className="font-display text-xl font-bold tracking-[-0.04em]">muzyng<span className="text-[var(--orange)]">.</span></Link>
      {isSubmitted ? <div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Almost there</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Check your email</h1><p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">If an account exists for that email, we&apos;ve sent a password reset link.</p><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Check your inbox and follow the link to choose a new password.</p><Link className="mt-8 block w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--orange-dark)]" href="/login">Back to login</Link></div> : <>
        <div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Account access</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Forgot password?</h1><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Enter your email and we&apos;ll send you a secure reset link.</p></div>
        <form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}><label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><input autoComplete="email" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" onChange={(event) => setEmail(event.target.value)} type="email" value={email} /></label>{error && <p className="rounded-xl bg-[#fff0e8] px-3 py-2 text-sm leading-5 text-[#a64220]" role="alert">{error}</p>}<button className="w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--orange-dark)] disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Sending..." : "Send reset link"}</button></form>
        <p className="mt-6 text-center text-sm text-[var(--ink-muted)]"><Link className="font-bold text-[var(--orange-dark)] hover:underline" href="/login">Back to login</Link></p>
      </>}
    </section>
  </main>;
}
