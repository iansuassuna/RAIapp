import { CalendarClock, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Card, Progress } from "@/components/ui";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/config/options";
import { formatShortDate, isOverdue } from "@/lib/format";
import type { Project } from "@/types";

/** Resumo do projeto: status, prazos e progresso das tarefas. `actions` = botões da coordenação. */
export function ProjectSummary({ project, actions }: { project: Project; actions?: ReactNode }) {
  const done = project.tasks.filter((t) => t.status === "concluida").length;
  const total = project.tasks.length;
  const late = isOverdue(project);

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status]}</Badge>
        {late && <Badge tone="danger">Prazo vencido</Badge>}
        {actions && <div className="ml-auto flex flex-wrap gap-1">{actions}</div>}
      </div>

      {project.description && <p className="text-sm leading-relaxed text-ink-muted">{project.description}</p>}

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-field bg-surface-muted/60 px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <CalendarDays className="size-3.5" aria-hidden /> Início
          </dt>
          <dd className="font-display text-sm font-bold text-brand-950">{formatShortDate(project.startDate)}</dd>
        </div>
        <div className="rounded-field bg-surface-muted/60 px-3 py-2.5">
          <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <CalendarClock className="size-3.5" aria-hidden /> Prazo final
          </dt>
          <dd className={`font-display text-sm font-bold ${late ? "text-danger-500" : "text-brand-950"}`}>
            {formatShortDate(project.deadline)}
          </dd>
        </div>
      </dl>

      <div>
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-brand-950">Tarefas concluídas</span>
          <span className="font-display font-bold text-iris-600">
            {done}
            <span className="text-xs font-medium text-ink-subtle">/{total}</span>
          </span>
        </div>
        <Progress value={done} max={Math.max(total, 1)} tone="light" label="Tarefas concluídas" />
      </div>
    </Card>
  );
}
