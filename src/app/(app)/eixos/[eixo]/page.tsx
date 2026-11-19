import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { ScorePanel } from "@/components/ui";
import { eixoLabel, isEixo } from "@/config/options";
import { EixoGoals, EixoIndicators, TeamPerformance } from "@/features/eixos";
import { canViewEixo } from "@/lib/access";
import { getEixoOverview } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

type Props = { params: Promise<{ eixo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eixo } = await params;
  if (!isEixo(eixo)) return { title: "Gestão de Eixos" };
  return { title: canViewEixo(await getCurrentMember(), eixo) ? eixoLabel(eixo) : "Sem acesso" };
}

export default async function EixoOverviewPage({ params }: Props) {
  const { eixo } = await params;
  if (!isEixo(eixo)) notFound();
  const overview = await getEixoOverview(await getCurrentMember(), eixo);
  if (!overview) forbidden();
  const { score, goal } = overview.performance;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
      <div className="space-y-8">
        <ScorePanel
          id="eixo-desempenho"
          title={`Desempenho · ${eixoLabel(eixo)}`}
          score={score}
          goal={goal}
          caption={
            <>
              Coordenação: <span className="font-semibold text-white">{overview.coordinator ?? "a definir"}</span>
            </>
          }
        />
        <TeamPerformance teams={overview.teams} />
      </div>
      <div className="space-y-8">
        <EixoIndicators overview={overview} />
        <EixoGoals goals={overview.goals} />
      </div>
    </div>
  );
}
