import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { padCount } from "@/lib/format";

const tones = {
  accent: "bg-accent-100 text-accent-700",
  iris: "bg-iris-100 text-iris-600",
  brand: "bg-brand-100 text-brand-700",
  warning: "bg-warning-50 text-warning-700",
} as const;

export type StatTone = keyof typeof tones;

type Props = {
  /** Números inteiros viram contadores com dois dígitos ("05"); strings são exibidas como vieram ("4,3"). */
  value: number | string;
  label: string;
  icon: LucideIcon;
  tone?: StatTone;
};

export function StatCard({ value, label, icon: Icon, tone = "iris" }: Props) {
  return (
    <div className="group rounded-card bg-surface p-4 shadow-card ring-1 ring-line/60 transition hover:-translate-y-0.5 hover:shadow-raised">
      <div className="flex items-start justify-between">
        <p className="font-display text-3xl font-extrabold tracking-tight text-iris-600">
          {typeof value === "number" ? padCount(value) : value}
        </p>
        <span className={cn("grid size-9 place-items-center rounded-xl transition group-hover:scale-110", tones[tone])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug text-brand-900">{label}</p>
    </div>
  );
}
