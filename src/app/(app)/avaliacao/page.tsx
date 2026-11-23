import type { Metadata } from "next";
import { CrossEvaluation, ReceivedScores } from "@/features/avaliacao";
import { getEvaluationCycle } from "@/lib/api";
import { cycleDeadlineText } from "@/lib/format";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Avaliação Cruzada" };

export default async function AvaliacaoPage() {
  const member = await getCurrentMember();
  const cycle = await getEvaluationCycle(member);

  return (
    <div className="space-y-8 pt-7">
      <div className="animate-fade-up">
        <p className="text-sm text-ink-muted">
          Ciclo {cycle.label} · {cycleDeadlineText(cycle.daysLeft, cycle.endsOn)} · suas respostas são anônimas
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">Avaliação Cruzada</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <CrossEvaluation cycle={cycle} />
        <ReceivedScores cycle={cycle} />
      </div>
    </div>
  );
}
