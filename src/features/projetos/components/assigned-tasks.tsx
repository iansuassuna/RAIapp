import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import { formatShortDate, isOverdue } from "@/lib/format";
import type { Project, Task } from "@/types";
import { updateTaskStatusAction } from "../actions";
import { TaskStatusSelect } from "./task-status-select";

/** Tarefas atribuídas ao membro, de todos os projetos, ordenadas por prazo. */
export function AssignedTasks({ items }: { items: { task: Task; project: Project }[] }) {
  const open = items.filter(({ task }) => task.status !== "concluida");
  const late = open.filter(({ task }) => isOverdue(task)).length;

  return (
    <section aria-labelledby="minhas-tarefas" className="space-y-3">
      <div>
        <SectionTitle id="minhas-tarefas">Prazos e tarefas</SectionTitle>
        <p className="text-xs text-ink-subtle">
          {open.length} em aberto{late > 0 && <span className="font-semibold text-danger-500"> · {late} atrasada(s)</span>}
        </p>
      </div>
      <Card className="p-2">
        {items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhuma tarefa atribuída a você" />
        ) : (
          <ul className="divide-y divide-line/70">
            {items.map(({ task, project }) => {
              const overdue = isOverdue(task);
              return (
                <li key={task.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-brand-950">{task.title}</span>
                    <span className="block text-xs text-ink-subtle">
                      <Link href={`/eixos/${project.eixo}/projetos/${project.id}`} className="font-medium text-brand-600 hover:text-accent-600 hover:underline">
                        {project.name}
                      </Link>{" "}
                      ·{" "}
                      <span className={overdue ? "font-semibold text-danger-500" : undefined}>
                        prazo {formatShortDate(task.deadline)}
                        {overdue && " (atrasada)"}
                      </span>
                    </span>
                  </span>
                  <TaskStatusSelect
                    status={task.status}
                    label={`Status de ${task.title}`}
                    action={updateTaskStatusAction.bind(null, project.id, task.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
