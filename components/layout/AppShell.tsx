"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import MusicPlayer from "@/components/music-player/MusicPlayer";
import { MusicPlayerProvider } from "@/components/music-player/MusicPlayerProvider";
import PresenceSync from "@/components/presence/PresenceSync";

const navItems = [
    { href: "/", label: "Home" },
    { href: "/search", label: "Search" },
    { href: "/friends", label: "Friends" },
];

function Navigation() {
    const pathname = usePathname();
    const { user, profile, isLoading, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen) return;
        const closeMenu = (event: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };
        document.addEventListener("pointerdown", closeMenu);
        return () => document.removeEventListener("pointerdown", closeMenu);
    }, [isMenuOpen]);

    return <header className="border-b border-[#d9d1c5] pb-4"><div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="font-display text-xl font-bold tracking-[-0.04em]">muzyng<span className="text-[var(--orange)]">.</span></Link>
        {isLoading ? <span className="text-xs text-[var(--ink-muted)]">Checking session...</span> : user && profile ? <>
            <nav aria-label="Primary navigation" className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto sm:gap-2">{navItems.map((item) => <Link className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${pathname === item.href ? "bg-[#eadfd3] text-[var(--foreground)]" : "text-[var(--ink-muted)] hover:text-[var(--foreground)]"}`} href={item.href} key={item.href}>{item.label}</Link>)}</nav>
            <div className="relative flex items-center gap-3 sm:gap-4" ref={menuRef}><span className="max-w-32 truncate text-sm text-[var(--ink-muted)]"><strong className="text-[var(--foreground)]">@{profile.username}</strong></span><button aria-expanded={isMenuOpen} aria-haspopup="menu" aria-label="Open user menu" className="text-[var(--orange-dark)] transition hover:text-[var(--orange)]" onClick={() => setIsMenuOpen((open) => !open)} type="button"><Menu aria-hidden="true" size={20} strokeWidth={2} /></button>{isMenuOpen ? <div className="absolute right-0 top-full z-50 mt-2 min-w-28 rounded-xl border border-[#d9d1c5] bg-[#fffdf9] p-1 shadow-[0_12px_30px_rgba(80,60,35,0.14)]" role="menu"><button className="w-full rounded-lg px-3 py-2 text-left text-[0.45rem] font-bold uppercase tracking-[0.12em] text-[var(--orange-dark)] hover:bg-[#f5eee5]" onClick={() => { setIsMenuOpen(false); void signOut(); }} role="menuitem" type="button">Log out</button></div> : null}</div>
        </> : <div className="flex items-center gap-4"><Link className="text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--foreground)]" href="/login">Log in</Link><Link className="rounded-full bg-[var(--orange)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--orange-dark)]" href="/signup">Sign up</Link></div>}
    </div></header>;
}

export default function AppShell({ children }: { children: ReactNode }) {
    const { user, profile } = useAuth();

    return <MusicPlayerProvider><div className="min-h-screen px-5 py-6 sm:px-10 sm:py-8"><div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <Navigation />
        <main className={`flex-1 py-8 sm:py-12 ${user && profile ? "pb-56 sm:pb-40" : ""}`}>{children}</main>
        {user && profile ? <PresenceSync userId={user.id} /> : null}
        {user && profile ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d9d1c5] bg-[color-mix(in_srgb,var(--background)_94%,white)]/95 shadow-[0_-12px_30px_rgba(80,60,35,0.08)] backdrop-blur"><div className="mx-auto max-w-6xl px-5 py-3 sm:px-10 sm:py-4"><MusicPlayer /></div></div> : null}
        <footer className="mt-8 flex items-center justify-between border-t border-[#d9d1c5] pt-5 text-xs text-[var(--ink-muted)]"><span>Listen together</span><span>Powered by Audius</span></footer>
    </div></div></MusicPlayerProvider>;
}