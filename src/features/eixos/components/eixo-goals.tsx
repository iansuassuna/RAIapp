import { Target } from "lucide-react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ACTIVITY_STATUS_LABEL, ACTIVITY_STATUS_TONE } from "@/config/options";
import { formatShortDate } from "@/lib/format";
import type { EixoOverview } from "@/types";

export function EixoGoals({ goals }: { goals: EixoOverview["goals"] }) {
  return (
    <section aria-labelledby="metas" className="space-y-3">
      <SectionTitle id="metas">Metas do eixo</SectionTitle>
      <Card className="p-2">
        {goals.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">Nenhuma meta cadastrada para este eixo.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Target className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-brand-950">{g.title}</span>
                  <span className="block text-xs text-ink-subtle">Prazo · {formatShortDate(g.deadline)}</span>
                </span>
                <Badge tone={ACTIVITY_STATUS_TONE[g.status]}>{ACTIVITY_STATUS_LABEL[g.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
