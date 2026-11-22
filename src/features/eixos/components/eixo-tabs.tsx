import Link from "next/link";
import { eixoLabel } from "@/config/options";
import { cn } from "@/lib/cn";
import type { Eixo } from "@/types";

/** Abas dos eixos que o membro pode ver. Só aparece quando há mais de um (ex.: diretoria). */
export function EixoTabs({ eixos, active }: { eixos: Eixo[]; active: Eixo }) {
  return (
    <nav
      aria-label="Eixos"
      className="grid gap-2 rounded-card bg-surface p-1.5 shadow-card ring-1 ring-line/60"
      style={{ gridTemplateColumns: `repeat(${eixos.length}, minmax(0, 1fr))` }}
    >
      {eixos.map((eixo) => {
        const selected = eixo === active;
        return (
          <Link
            key={eixo}
            href={`/eixos/${eixo}`}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-xl px-2 py-2 text-center font-display text-xs font-semibold leading-tight tracking-tight transition sm:text-sm",
              selected
                ? "bg-brand-900 text-white shadow-raised"
                : "text-ink-muted hover:bg-surface-muted hover:text-brand-900",
            )}
          >
            {eixoLabel(eixo)}
          </Link>
        );
      })}
    </nav>
  );
}
