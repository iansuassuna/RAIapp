import { useId } from "react";
import { cn } from "@/lib/cn";

type LogoMarkProps = { className?: string; tone?: "dark" | "light" };

/** Símbolo RAITec: o "7" sólido + as trilhas de circuito. Recriado em SVG para escalar sem perda. */
export function LogoMark({ className, tone = "dark" }: LogoMarkProps) {
  const gid = useId();
  const solid = tone === "dark" ? "var(--color-brand-900)" : "var(--color-surface)";
  const traceEnd = tone === "dark" ? "var(--color-brand-900)" : "var(--color-brand-200)";
  const traces = [0, 1, 2, 3].map((i) => {
    const x = 74 + i * 8;
    const yTop = 6 + i * 7;
    const yTurn = 88 - i * 7;
    const xEnd = 138 - i * 3;
    return { x, yTop, yTurn, xEnd };
  });

  return (
    <svg viewBox="0 0 146 184" className={cn("h-auto", className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--color-accent-400)" />
          <stop offset="100%" stopColor={traceEnd} />
        </linearGradient>
      </defs>
      <path
        d="M4 82 Q4 76 10 76 H58 Q66 76 66 84 V172 Q66 182 58 178 L52 175 Q47 172 47 166 V100 Q47 96 43 96 H10 Q4 96 4 90 Z"
        fill={solid}
      />
      {traces.map(({ x, yTop, yTurn, xEnd }) => (
        <g key={`${x}-${yTop}`}>
          <path
            d={`M${x} ${yTop} V${yTurn - 4} Q${x} ${yTurn} ${x + 4} ${yTurn} H${xEnd}`}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx={x} cy={yTop} r="3.6" fill="var(--color-accent-400)" />
          <circle cx={xEnd} cy={yTurn} r="3.6" fill={solid} />
        </g>
      ))}
    </svg>
  );
}

type LogoProps = { className?: string; tone?: "dark" | "light"; size?: "sm" | "lg" };

export function Logo({ className, tone = "dark", size = "lg" }: LogoProps) {
  const large = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", large && "flex-col gap-4", className)}>
      <LogoMark tone={tone} className={large ? "w-24" : "w-8"} />
      <span
        className={cn(
          "font-display tracking-tight",
          large ? "text-3xl" : "text-lg",
          tone === "dark" ? "text-brand-950" : "text-white",
        )}
      >
        <span className="font-extrabold">RAITec</span> <span className="font-light">App</span>
      </span>
    </div>
  );
}
