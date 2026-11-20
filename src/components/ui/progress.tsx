import { cn } from "@/lib/cn";

type Props = {
  value: number;
  max?: number;
  label?: string;
  /** "dark" para usar sobre fundos escuros (ScorePanel); "light" sobre cards brancos. */
  tone?: "dark" | "light";
  className?: string;
};

export function Progress({ value, max = 100, label = "Progresso", tone = "dark", className }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full",
        tone === "dark" ? "bg-white/15" : "bg-surface-muted",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent-300 to-accent-500 transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
