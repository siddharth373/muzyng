"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthFormProps = { mode: "login" | "signup" };
const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); setMessage(null);
    const normalizedUsername = username.trim().toLowerCase();
    if (isSignup && !usernamePattern.test(normalizedUsername)) { setError("Username must be 3-24 letters, numbers, or underscores."); return; }
    if (isSignup && password !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase is not configured. Add the values in .env.local and restart the app.");
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: normalizedUsername } } });
        if (signUpError) throw signUpError;
        if (data.session) router.push("/");
        else setMessage("Account created. Check your email to confirm your account, then log in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        router.push("/");
      }
    } catch (submitError) {
      const rawMessage = submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.";
      setError(rawMessage.toLowerCase().includes("username already taken") ? "Username already taken." : rawMessage);
    } finally { setIsSubmitting(false); }
  };

  return <main className="flex min-h-screen items-center justify-center px-5 py-10">
    <section className="w-full max-w-[430px] rounded-[28px] border border-[#ded6ca] bg-[#fffdf9] p-6 shadow-[0_24px_70px_rgba(80,60,35,0.11)] sm:p-8">
      <Link href="/" className="font-display text-xl font-bold tracking-[-0.04em]">muzyng<span className="text-[var(--orange)]">.</span></Link>
      <div className="mb-8 mt-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">{isSignup ? "New here" : "Welcome back"}</p><h1 className="font-display text-3xl font-bold tracking-[-0.05em]">{isSignup ? "Create your account" : "Log in to Muzyng"}</h1><p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{isSignup ? "Choose a username and make your listening space yours." : "Your player is waiting."}</p></div>
      <form className="space-y-4" onSubmit={submit}>
        {isSignup && <label className="block"><span className="mb-2 block text-sm font-semibold">Username</span><input autoComplete="username" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" maxLength={24} minLength={3} onChange={(event) => setUsername(event.target.value)} pattern="[A-Za-z0-9_]{3,24}" required value={username} /></label>}
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email</span><input autoComplete="email" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><input autoComplete={isSignup ? "new-password" : "current-password"} className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
        {isSignup && <label className="block"><span className="mb-2 block text-sm font-semibold">Confirm password</span><input autoComplete="new-password" className="w-full rounded-xl border border-[#d9d1c5] bg-[#fbf7f0] px-4 py-3 text-sm outline-none transition focus:border-[var(--orange)]" minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} /></label>}
        {error && <p className="rounded-xl bg-[#fff0e8] px-3 py-2 text-sm leading-5 text-[#a64220]" role="alert">{error}</p>}
        {message && <p className="rounded-xl bg-[#edf6eb] px-3 py-2 text-sm leading-5 text-[#3f7042]" role="status">{message}</p>}
        <button className="w-full rounded-xl bg-[var(--orange)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--orange-dark)] disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Working..." : isSignup ? "Create account" : "Log in"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--ink-muted)]">{isSignup ? "Already have an account?" : "Don't have an account?"} <Link className="font-bold text-[var(--orange-dark)] hover:underline" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Sign up"}</Link></p>
    </section>
  </main>;
}