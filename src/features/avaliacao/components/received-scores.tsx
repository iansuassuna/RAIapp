import { BarChart3, ShieldCheck } from "lucide-react";
import { Card, EmptyState, Progress, SectionTitle } from "@/components/ui";
import { formatAverage } from "@/lib/format";
import type { EvaluationCycle } from "@/types";

/** Médias que o membro recebeu dos colegas no ciclo anterior. */
export function ReceivedScores({ cycle }: { cycle: EvaluationCycle }) {
  return (
    <section aria-labelledby="recebidas" className="space-y-3">
      <div>
        <SectionTitle id="recebidas">Como você foi avaliado</SectionTitle>
        <p className="text-xs text-ink-subtle">Média dos colegas no ciclo anterior (1 a 5)</p>
      </div>
      <Card className="space-y-5">
        {Object.keys(cycle.received).length === 0 && (
          <EmptyState icon={BarChart3} title="Sem avaliações no ciclo anterior" />
        )}
        {Object.keys(cycle.received).length > 0 &&
          cycle.criteria.map((c) => {
            const avg = cycle.received[c.id] ?? 0;
            return (
              <div key={c.id}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-brand-950">{c.label}</span>
                  <span className="font-display text-sm font-bold text-iris-600">{formatAverage(avg)}</span>
                </div>
                <Progress value={avg} max={5} tone="light" label={`Média em ${c.label}`} />
              </div>
            );
          })}
      </Card>
      <p className="flex items-start gap-2 px-1 text-xs text-ink-subtle">
        <ShieldCheck className="mt-px size-4 shrink-0 text-accent-600" />
        Quem é avaliado vê apenas as médias, nunca quem deu cada nota. A coordenação do eixo do avaliado tem acesso às
        avaliações detalhadas.
      </p>
    </section>
  );
}
