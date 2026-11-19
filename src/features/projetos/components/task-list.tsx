import { ClipboardList, Trash2 } from "lucide-react";
import { Badge, Card, ConfirmButton, EmptyState, SectionTitle } from "@/components/ui";
import { TASK_STATUS_LABEL, TASK_STATUS_TONE } from "@/config/options";
import { formatShortDate, isOverdue } from "@/lib/format";
import type { Project } from "@/types";
import { addTaskAction, deleteTaskAction, updateTaskStatusAction } from "../actions";
import { TaskForm } from "./task-form";
import { TaskStatusSelect } from "./task-status-select";

type Props = {
  project: Project;
  memberNames: Record<string, string>;
  viewerId: string;
  /** Coordenação do eixo: cria, exclui e muda o status de qualquer tarefa. */
  canManage: boolean;
};

/** Tarefas e prazos do projeto. O responsável muda o status da própria tarefa. */
export function TaskList({ project, memberNames, viewerId, canManage }: Props) {
  const tasks = [...project.tasks].sort((a, b) => a.deadline.localeCompare(b.deadline));

  return (
    <section aria-labelledby="tarefas" className="space-y-3">
      <SectionTitle id="tarefas">Tarefas e prazos</SectionTitle>
      <Card className="p-2">
        {tasks.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhuma tarefa cadastrada">
            {canManage ? "Adicione a primeira tarefa abaixo." : "A coordenação ainda não criou tarefas."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/70">
            {tasks.map((task) => {
              const late = isOverdue(task);
              const editable = canManage || task.assigneeId === viewerId;
              return (
                <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block text-sm font-semibold text-brand-950">{task.title}</span>
                    <span className="block text-xs text-ink-subtle">
                      {task.assigneeId ? (memberNames[task.assigneeId] ?? "Membro removido") : "Sem responsável"} ·{" "}
                      <span className={late ? "font-semibold text-danger-500" : undefined}>
                        prazo {formatShortDate(task.deadline)}
                        {late && " (atrasada)"}
                      </span>
                    </span>
                  </span>
                  {editable ? (
                    <TaskStatusSelect
                      status={task.status}
                      label={`Status de ${task.title}`}
                      action={updateTaskStatusAction.bind(null, project.id, task.id)}
                    />
                  ) : (
                    <Badge tone={TASK_STATUS_TONE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>
                  )}
                  {canManage && (
                    <ConfirmButton onConfirm={deleteTaskAction.bind(null, project.id, task.id)} confirmLabel="Excluir" aria-label={`Excluir ${task.title}`}>
                      <Trash2 className="size-4" aria-hidden />
                    </ConfirmButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {canManage && (
        <TaskForm
          action={addTaskAction.bind(null, project.id)}
          members={project.memberIds.map((id) => ({ value: id, label: memberNames[id] ?? "Membro removido" }))}
        />
      )}
    </section>
  );
}
