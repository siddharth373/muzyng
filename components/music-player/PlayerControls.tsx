import { Pause, Play } from "lucide-react";

type PlayerControlsProps = { isPlaying: boolean; disabled: boolean; onToggle: () => void };

export default function PlayerControls({ isPlaying, disabled, onToggle }: PlayerControlsProps) {
  return <div className="flex items-center justify-center"><button aria-label={isPlaying ? "Pause track" : "Play track"} className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--orange)] text-white shadow-[0_8px_20px_rgba(243,109,58,0.25)] transition hover:bg-[var(--orange-dark)] disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} onClick={onToggle} type="button">{isPlaying ? <Pause aria-hidden="true" size={20} strokeWidth={2.5} /> : <Play aria-hidden="true" className="ml-0.5" fill="currentColor" size={20} strokeWidth={2} />}</button></div>;
}