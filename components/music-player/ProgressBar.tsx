type ProgressBarProps = { currentTime: number; duration: number; disabled: boolean; onSeek: (value: number) => void };

export default function ProgressBar({ currentTime, duration, disabled, onSeek }: ProgressBarProps) {
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  return <input aria-label="Seek through track" className="h-1.5 w-full cursor-pointer accent-[var(--orange)] disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} max={duration || 0} min="0" onChange={(event) => onSeek(Number(event.target.value))} style={{ background: `linear-gradient(to right, var(--orange) ${progress}%, #ded6ca ${progress}%)` }} type="range" value={Math.min(currentTime, duration || 0)} />;
}