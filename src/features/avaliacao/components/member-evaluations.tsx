import { BarChart3, MessageSquareText } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, Progress, SectionTitle } from "@/components/ui";
import { EVALUATION_CRITERIA } from "@/config/options";
import { formatAverage, formatDateTime } from "@/lib/format";
import type { EvaluationRecord } from "@/types";

type CycleReport = {
  label: string;
  averages: Record<string, number>;
  overall: number | null;
  evaluations: (EvaluationRecord & { evaluatorName: string; evaluatorContext: string })[];
};

/** Relatório detalhado das avaliações recebidas por um membro (coordenação do eixo). */
export function MemberEvaluations({ cycles }: { cycles: CycleReport[] }) {
  return (
    <div className="space-y-10">
      {cycles.map((cycle, i) => {
        const id = `ciclo-${i}`;
        return (
          <section key={cycle.label} aria-labelledby={id} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionTitle id={id}>
                Ciclo {cycle.label} {i === 0 && <span className="text-sm font-medium text-ink-subtle">(atual)</span>}
              </SectionTitle>
              <p className="text-sm text-ink-muted">
                {cycle.evaluations.length} {cycle.evaluations.length === 1 ? "avaliação" : "avaliações"}
                {cycle.overall !== null && (
                  <>
                    {" · média geral "}
                    <span className="font-display font-bold text-iris-600">{formatAverage(cycle.overall)}</span>
                  </>
                )}
              </p>
            </div>

            {cycle.evaluations.length === 0 ? (
              <Card>
                <EmptyState icon={BarChart3} title="Nenhuma avaliação recebida neste ciclo" />
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
                <Card className="space-y-4">
                  <p className="font-display text-sm font-bold text-brand-900">Média por critério</p>
                  {EVALUATION_CRITERIA.map((c) => {
                    const avg = cycle.averages[c.id] ?? 0;
                    return (
                      <div key={c.id}>
                        <div className="mb-1.5 flex items-baseline justify-between text-sm">
                          <span className="font-medium text-brand-950">{c.label}</span>
                          <span className="font-display font-bold text-iris-600">{formatAverage(avg)}</span>
                        </div>
                        <Progress value={avg} max={5} tone="light" label={`Média em ${c.label}`} />
                      </div>
                    );
                  })}
                </Card>

                <Card className="p-2">
                  <ul className="divide-y divide-line/70">
                    {cycle.evaluations.map((e) => (
                      <li key={e.id} className="space-y-3 px-3 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar decorative name={e.evaluatorName} className="size-9 text-xs ring-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-brand-950">
                              {e.evaluatorName}
                            </span>
                            <span className="block text-xs text-ink-subtle">
                              {e.evaluatorContext} · {formatDateTime(e.submittedAt)}
                            </span>
                          </span>
                        </div>
                        <ul className="flex flex-wrap gap-1.5" aria-label="Notas">
                          {EVALUATION_CRITERIA.map((c) => (
                            <li key={c.id}>
                              <Badge
                                tone={
                                  (e.ratings[c.id] ?? 0) >= 4
                                    ? "success"
                                    : (e.ratings[c.id] ?? 0) >= 3
                                      ? "brand"
                                      : "danger"
                                }
                                dot={false}
                              >
                                {c.label}: {e.ratings[c.id] ?? "–"}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                        {e.comment && (
                          <p className="flex gap-2 rounded-field bg-surface-muted/60 px-3 py-2 text-sm text-ink-muted">
                            <MessageSquareText className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden />
                            {e.comment}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
