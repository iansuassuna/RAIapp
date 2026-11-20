import { CalendarClock, ListChecks, Users } from "lucide-react";
import Link from "next/link";
import { Badge, Progress } from "@/components/ui";
import { eixoLabel, PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from "@/config/options";
import { formatShortDate, isOverdue } from "@/lib/format";
import type { Project } from "@/types";

export function ProjectCard({ project, showEixo }: { project: Project; showEixo?: boolean }) {
  const done = project.tasks.filter((t) => t.status === "concluida").length;
  const total = project.tasks.length;
  const late = isOverdue(project);

  return (
    <Link
      href={`/eixos/${project.eixo}/projetos/${project.id}`}
      className="group flex flex-col rounded-card bg-surface p-5 shadow-card ring-1 ring-line/60 transition hover:-translate-y-0.5 hover:shadow-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showEixo && <p className="text-xs font-medium text-accent-700">{eixoLabel(project.eixo)}</p>}
          <h3 className="font-display text-base font-bold tracking-tight text-brand-950 group-hover:text-brand-700">
            {project.name}
          </h3>
        </div>
        <Badge tone={PROJECT_STATUS_TONE[project.status]} className="shrink-0">
          {PROJECT_STATUS_LABEL[project.status]}
        </Badge>
      </div>

      {project.description && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{project.description}</p>}

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="size-3.5" aria-hidden /> {done}/{total} tarefas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden /> {project.memberIds.length}
          </span>
        </div>
        <Progress value={done} max={Math.max(total, 1)} tone="light" label={`Tarefas concluídas em ${project.name}`} />
      </div>

      <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-medium ${late ? "text-danger-500" : "text-ink-muted"}`}>
        <CalendarClock className="size-3.5" aria-hidden />
        Prazo {formatShortDate(project.deadline)}
        {late && " · atrasado"}
      </p>
    </Link>
  );
}
