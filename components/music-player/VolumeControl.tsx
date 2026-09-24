import { Volume2 } from "lucide-react";

type VolumeControlProps = { volume: number; onChange: (value: number) => void };

export default function VolumeControl({ volume, onChange }: VolumeControlProps) {
  return <label className="flex items-center gap-3 text-[var(--ink-muted)]"><Volume2 aria-hidden="true" className="shrink-0" size={16} strokeWidth={2} /><input aria-label="Volume" className="h-1 w-28 cursor-pointer accent-[var(--orange)]" max="1" min="0" onChange={(event) => onChange(Number(event.target.value))} step="0.01" type="range" value={volume} /></label>;
}