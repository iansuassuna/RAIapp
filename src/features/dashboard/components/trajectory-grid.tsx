import { BookOpen, ClipboardList, GraduationCap, MapPin } from "lucide-react";
import { SectionTitle, StatCard } from "@/components/ui";
import type { Trajectory } from "@/types";

export function TrajectoryGrid({ data }: { data: Trajectory }) {
  return (
    <section aria-labelledby="trajetoria" className="space-y-3">
      <SectionTitle id="trajetoria">Minha trajetória</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={data.capacitacoes} label="Capacitações realizadas" icon={GraduationCap} tone="accent" />
        <StatCard value={data.cursos} label="Cursos concluídos" icon={BookOpen} tone="iris" />
        <StatCard value={data.visitas} label="Visitas realizadas" icon={MapPin} tone="brand" />
        <StatCard value={data.atividades} label="Atividades registradas" icon={ClipboardList} tone="warning" />
      </div>
    </section>
  );
}
