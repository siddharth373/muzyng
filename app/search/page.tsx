import MusicDiscovery from "@/components/music-discovery/MusicDiscovery";

export default function SearchPage() {
  return <section className="mx-auto max-w-2xl"><div className="mb-8"><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--orange-dark)]">Audius</p><h1 className="font-display text-4xl font-bold tracking-[-0.06em]">Find your next track</h1><p className="mt-2 text-sm text-[var(--ink-muted)]">Search songs and artists, then press play.</p></div><MusicDiscovery /></section>;
}