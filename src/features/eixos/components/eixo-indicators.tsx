import { ClipboardList, FolderKanban, Star, Users } from "lucide-react";
import { SectionTitle, StatCard } from "@/components/ui";
import { formatAverage } from "@/lib/format";
import type { EixoOverview } from "@/types";

export function EixoIndicators({ overview }: { overview: EixoOverview }) {
  return (
    <section aria-labelledby="indicadores" className="space-y-3">
      <SectionTitle id="indicadores">Indicadores</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={overview.memberCount} label="Membros no eixo" icon={Users} tone="accent" />
        <StatCard value={overview.activeProjects} label="Projetos ativos" icon={FolderKanban} tone="brand" />
        <StatCard value={overview.activitiesCount} label="Atividades registradas" icon={ClipboardList} tone="warning" />
        <StatCard
          value={overview.crossEvaluationAverage === null ? "–" : formatAverage(overview.crossEvaluationAverage)}
          label="Média da avaliação cruzada"
          icon={Star}
          tone="iris"
        />
      </div>
    </section>
  );
}
