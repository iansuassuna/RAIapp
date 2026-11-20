import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Progress } from "./progress";

type Props = {
  id: string;
  title: string;
  score: number;
  goal: number;
  /** Texto abaixo da barra (ex.: "Faltam 70 pontos…"). */
  caption?: ReactNode;
  /** Conteúdo extra no rodapé do painel (ex.: botões). */
  children?: ReactNode;
  className?: string;
};

/** Painel de destaque escuro com pontuação, % e barra de progresso. Usado em desempenho, eixos e avaliações. */
export function ScorePanel({ id, title, score, goal, caption, children, className }: Props) {
  const pct = goal > 0 ? Math.round((score / goal) * 100) : 0;

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "relative overflow-hidden rounded-panel bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 p-6 text-white shadow-raised",
        className,
      )}
    >
      <div className="bg-circuit absolute inset-0 opacity-70" aria-hidden />
      <div className="absolute -right-16 -top-20 size-56 rounded-full bg-accent-500/30 blur-3xl" aria-hidden />
      <div className="absolute -bottom-24 left-10 size-48 rounded-full bg-iris-500/25 blur-3xl" aria-hidden />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id={id} className="text-sm font-medium text-brand-200">
              {title}
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tracking-tight">
              {score}
              <span className="text-2xl font-semibold text-brand-300">/{goal}</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent-300 ring-1 ring-white/15 backdrop-blur">
            <TrendingUp className="size-3.5" /> {pct}%
          </span>
        </div>

        <Progress value={score} max={goal} label={title} className="mt-6" />

        {caption && <p className="mt-3 text-xs text-brand-200">{caption}</p>}
        {children}
      </div>
    </section>
  );
}
