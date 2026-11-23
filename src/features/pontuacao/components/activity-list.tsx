"use client";

import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, Button, ConfirmButton, EmptyState } from "@/components/ui";
import { ACTIVITY_TYPE_ICON } from "@/config/activity-icons";
import { ACTIVITY_STATUS_LABEL, ACTIVITY_STATUS_TONE, ACTIVITY_TYPE_LABEL } from "@/config/options";
import { formatShortDate } from "@/lib/format";
import type { MemberActivity } from "@/types";
import { deleteActivityAction } from "../actions";
import { ActivityForm } from "./activity-form";

type Props = {
  memberId: string;
  activities: MemberActivity[];
  /** Coordenação do eixo / diretoria: pode registrar, editar e excluir. */
  canManage: boolean;
};

export function ActivityList({ memberId, activities, canManage }: Props) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error && <Alert tone="danger">{error}</Alert>}
      {canManage &&
        (editing === "new" ? (
          <ActivityForm memberId={memberId} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
        ) : (
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden /> Nova atividade
            </Button>
          </div>
        ))}

      {activities.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma atividade registrada">
          {canManage
            ? "Registre capacitações, cursos, visitas e projetos para somar pontos."
            : "A coordenação do seu eixo registra suas capacitações, cursos e visitas."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line/70">
          {activities.map((a) => {
            const Icon = ACTIVITY_TYPE_ICON[a.type];
            const counts = a.status === "concluida" && a.points > 0;
            if (editing === a.id) {
              return (
                <li key={a.id} className="py-3">
                  <ActivityForm
                    memberId={memberId}
                    activity={a}
                    onDone={() => setEditing(null)}
                    onCancel={() => setEditing(null)}
                  />
                </li>
              );
            }
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-brand-950">{a.title}</span>
                  <span className="block text-xs text-ink-subtle">
                    {ACTIVITY_TYPE_LABEL[a.type]} · {formatShortDate(a.date)} ·{" "}
                    {counts ? `+${a.points} pts` : a.points > 0 ? `${a.points} pts ao concluir` : "sem pontos"}
                  </span>
                </span>
                <Badge tone={ACTIVITY_STATUS_TONE[a.status]}>{ACTIVITY_STATUS_LABEL[a.status]}</Badge>
                {canManage && (
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(a.id)}
                      aria-label={`Editar ${a.title}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <ConfirmButton
                      aria-label={`Excluir ${a.title}`}
                      confirmLabel={counts ? `Excluir e estornar ${a.points} pts` : "Confirmar exclusão"}
                      onConfirm={async () => {
                        setError(null);
                        const result = await deleteActivityAction(a.id);
                        if (!result.ok) setError(result.error);
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </ConfirmButton>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
