import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { formatShortDate, todayIso } from "@/lib/format";
import type { DeadlineRow } from "@/types";
import { Badge } from "./badge";

/** Itens de prazo vindos de requisições, para entrar em listas de tarefas (mesmo visual das linhas de tarefa). */
export function DeadlineRows({ rows }: { rows: DeadlineRow[] }) {
  const today = todayIso();
  return (
    <>
      {rows.map((row) => {
        const late = row.deadline < today && row.badge.tone !== "success";
        const title = row.href ? (
          <Link href={row.href} className="hover:text-accent-600 hover:underline">
            {row.title}
          </Link>
        ) : (
          row.title
        );
        return (
          <li key={row.id} className="flex items-center gap-3 px-3 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warning-50 text-warning-700">
              <CalendarClock className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-brand-950">{title}</span>
              <span className="block text-xs text-ink-subtle">
                {row.subtitle} ·{" "}
                <span className={late ? "font-semibold text-danger-500" : undefined}>
                  prazo {formatShortDate(row.deadline)}
                  {late && " (atrasado)"}
                </span>
              </span>
            </span>
            <Badge tone={row.badge.tone}>{row.badge.label}</Badge>
          </li>
        );
      })}
    </>
  );
}
