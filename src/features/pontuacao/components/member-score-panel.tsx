import { History, ListChecks, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Card, ScorePanel } from "@/components/ui";
import { SCORE_GOAL } from "@/config/options";
import type { MemberActivity, ScoreEntry } from "@/types";
import { ActivityList } from "./activity-list";
import { ScoreAdjustForm } from "./score-adjust-form";
import { ScoreHistory } from "./score-history";

type Props = {
  memberId: string;
  score: number;
  activities: MemberActivity[];
  entries: ScoreEntry[];
  canManage: boolean;
  /** Título do painel de pontuação (ex.: "Sua pontuação" ou "Pontuação de Bruno"). */
  scoreTitle: string;
};

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: typeof History;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card className="space-y-3">
        <h2 id={id} className="flex items-center gap-2 font-display text-sm font-bold text-brand-900">
          <Icon className="size-4 text-accent-600" aria-hidden /> {title}
        </h2>
        {children}
      </Card>
    </section>
  );
}

/** Atividades + pontuação de um membro. Usado em /atividades (leitura) e na gestão pela coordenação/diretoria. */
export function MemberScorePanel({ memberId, score, activities, entries, canManage, scoreTitle }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <Section id="score-activities" title="Atividades" icon={ListChecks}>
        <ActivityList memberId={memberId} activities={activities} canManage={canManage} />
      </Section>
      <div className="space-y-6">
        <ScorePanel id="member-score-title" title={scoreTitle} score={score} goal={SCORE_GOAL} />
        {canManage && (
          <Section id="score-adjust" title="Ajuste manual" icon={SlidersHorizontal}>
            <ScoreAdjustForm memberId={memberId} />
          </Section>
        )}
        <Section id="score-history" title="Histórico de pontos" icon={History}>
          <ScoreHistory entries={entries} />
        </Section>
      </div>
    </div>
  );
}
