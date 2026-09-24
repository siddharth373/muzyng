"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthFormProps = { mode: "login" | "signup" };
const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

function isExistingEmailError(error: { code?: string; message?: string } | null) {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";
  return code === "user_already_exists" || code === "email_exists" || message.includes("already registered") || message.includes("already exists");
}

function getAuthErrorMessage(error: unknown, isSignup: boolean) {
  if (isSignup && isExistingEmailError(error as { code?: string; message?: string })) return "An account with this email already exists. Try logging in instead.";
  if (!isSignup) return "We couldn't log you in. Check your email and password and try again.";
  return "We couldn't create your account right now. Please try again.";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExistingEmail, setIsExistingEmail] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); setIsExistingEmail(false);
    const normalizedEmail = email.trim();
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedEmail) { setError("Please enter your email address."); return; }
    if (!emailPattern.test(normalizedEmail)) { setError("Please enter a valid email address."); return; }
    if (isSignup && !normalizedUsername) { setError("Username must be 3-24 letters, numbers, or underscores."); return; }
    if (isSignup && !usernamePattern.test(normalizedUsername)) { setError("Username must be 3-24 letters, numbers, or underscores."); return; }
    if (password.length < minimumPasswordLength) { setError(`Password must be at least ${minimumPasswordLength} characters.`); return; }
    if (isSignup && password !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      if (isSignup) {
        const emailRedirectTo = `${window.location.origin}/auth/callback?next=/`;
        const { data, error: signUpError } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { username: normalizedUsername }, emailRedirectTo } });
        if (isExistingEmailError(signUpError) || (!signUpError && data.user?.identities?.length === 0)) { setIsExistingEmail(true); setError("An account with this email already exists. Try logging in instead."); return; }
        if (signUpError) throw signUpError;
        if (data.session) router.push("/");
        else setConfirmationEmail(normalizedEmail);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;
        router.push("/");
      }
    } catch (submitError) {
      const rawMessage = submitError instanceof Error ? submitError.message.toLowerCase() : "";
      setError(rawMessage.includes("username already taken") ? "Username already taken." : getAuthErrorMessage(submitError, isSignup));
    } finally { setIsSubmitting(false); }
  };

  if (confirmationEmail) return <main className="flex min-h-screen items-center justify-center px-5 py-10">
    <section className="w-full max-w-[430px] rounded-[28px] border border-[#ded6ca] bg-[#fffdf9] p-6 shadow-[0_24px_70px_rgba(80,60,35,0.11)] sm:p-8">
      <Link href="/" className="font-display text-xl font-bold tracking-[-0.04em]">muzyng<span className="text-[var(--orange)]">.</span></Link>
      <div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Almost there</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Check your email</h1><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">We&apos;ve sent a confirmation link to:</p><p className="mt-2 break-all font-semibold">{confirmationEmail}</p><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">Click the link in that email to confirm your account, then log in.</p></div>
      <Link className="block w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--orange-dark)]" href="/login">Go to login</Link>
      <button className="mt-4 w-full text-sm font-semibold text-[var(--orange-dark)] hover:underline" onClick={() => setConfirmationEmail(null)} type="button">Use a different email</button>
    </section>
  </main>;

  return <main className="flex min-h-screen items-center justify-center px-5 py-10">
    <section className="w-full max-w-[430px] rounded-[28px] border border-[#ded6ca] bg-[#fffdf9] p-6 shadow-[0_24px_70px_rgba(80,60,35,0.11)] sm:p-8">
      <Link href="/" className="font-display text-xl font-bold tracking-[-0.04em]">muzyng<span className="text-[var(--orange)]">.</span></Link>
      <div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">{isSignup ? "New here" : "Welcome back"}</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">{isSignup ? "Create your account" : "Log in to Muzyng"}</h1><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{isSignup ? "Choose a username and make your listening space yours." : "Your player is waiting."}</p></div>
      <form className="space-y-4" noValidate onSubmit={(event) => void submit(event)}>
        {isSignup && <label className="block"><span className="mb-2 block text-sm font-semibold">Username</span><input autoComplete="username" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" maxLength={24} onChange={(event) => setUsername(event.target.value)} value={username} /></label>}
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><input autoComplete="email" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" onChange={(event) => setEmail(event.target.value)} type="email" value={email} /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><input autoComplete={isSignup ? "new-password" : "current-password"} className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>
        {isSignup && <label className="block"><span className="mb-2 block text-sm font-semibold">Confirm password</span><input autoComplete="new-password" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} /></label>}
        {!isSignup && <Link className="block text-sm font-semibold text-[var(--orange-dark)] hover:underline" href="/forgot-password">Forgot password?</Link>}
        {error && <p className="rounded-xl bg-[#fff0e8] px-3 py-2 text-sm leading-5 text-[#a64220]" role="alert">{error}</p>}
        {isExistingEmail && <Link className="block text-sm font-bold text-[var(--orange-dark)] hover:underline" href="/login">Log in instead</Link>}
        <button className="w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--orange-dark)] disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Working..." : isSignup ? "Create account" : "Log in"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--ink-muted)]">{isSignup ? "Already have an account?" : "Don't have an account?"} <Link className="font-bold text-[var(--orange-dark)] hover:underline" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Sign up"}</Link></p>
    </section>
  </main>;
}