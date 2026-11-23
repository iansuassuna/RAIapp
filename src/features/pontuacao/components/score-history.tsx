import { History } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { ScoreEntry } from "@/types";

/** Histórico de pontuação (ledger): cada linha é um lançamento; nada é apagado, correções viram estorno. */
export function ScoreHistory({ entries }: { entries: ScoreEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState icon={History} title="Sem lançamentos">
        Os pontos aparecem aqui quando forem lançados.
      </EmptyState>
    );
  }
  return (
    <ul className="divide-y divide-line/70">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-3">
          <span
            className={cn(
              "grid h-8 min-w-14 shrink-0 place-items-center rounded-full px-2 font-display text-sm font-bold",
              e.delta > 0 ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700",
            )}
          >
            {e.delta > 0 ? `+${e.delta}` : e.delta}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-brand-950">{e.reason}</span>
            <span className="block text-xs text-ink-subtle">
              {e.source === "ajuste" ? "Ajuste" : "Atividade"} · {formatDateTime(e.createdAt)}
              {e.createdByName ? ` · por ${e.createdByName}` : ""}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
