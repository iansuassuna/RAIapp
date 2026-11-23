"use client";

import { CalendarDays, Check, Flag, Pencil, Plus, Target, Trash2, Type } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, Button, Card, ConfirmButton, EmptyState, Input, SectionTitle, Select } from "@/components/ui";
import { ACTIVITY_STATUS_LABEL, ACTIVITY_STATUS_TONE, ACTIVITY_STATUSES } from "@/config/options";
import { useFormSubmit } from "@/lib/form";
import { formatShortDate } from "@/lib/format";
import type { Eixo, EixoGoal } from "@/types";
import { createGoalAction, deleteGoalAction, updateGoalAction } from "../actions";
import { goalSchema } from "../schemas";

const statusOptions = ACTIVITY_STATUSES.map((s) => ({ value: s, label: ACTIVITY_STATUS_LABEL[s] }));

function GoalForm({ eixo, goal, onDone }: { eixo: Eixo; goal?: EixoGoal; onDone: () => void }) {
  const prefix = goal ? `goal-${goal.id}` : "goal-new";
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(goalSchema, async (data) => {
    const result = goal ? await updateGoalAction(goal.id, data) : await createGoalAction(eixo, data);
    if (result.ok) onDone();
    return result;
  });

  return (
    <form
      onSubmit={handleSubmit}
      onChange={handleChange}
      noValidate
      className="space-y-3 rounded-card bg-surface-muted/60 p-3 ring-1 ring-line"
    >
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Input
        id={`${prefix}-title`}
        name="title"
        label="Meta"
        icon={Type}
        placeholder="Ex.: Capacitação de Git para o eixo"
        defaultValue={goal?.title}
        maxLength={120}
        error={errors.title}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id={`${prefix}-deadline`}
          name="deadline"
          type="date"
          label="Prazo"
          icon={CalendarDays}
          defaultValue={goal?.deadline}
          error={errors.deadline}
        />
        <Select
          id={`${prefix}-status`}
          name="status"
          label="Status"
          icon={Flag}
          placeholder="Escolha o status..."
          options={statusOptions}
          defaultValue={goal?.status ?? "pendente"}
          error={errors.status}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          <Check className="size-4" aria-hidden /> {goal ? "Salvar meta" : "Criar meta"}
        </Button>
      </div>
    </form>
  );
}

/** Metas do eixo com CRUD (coordenação do eixo, no Painel da Coordenação). */
export function GoalManager({ eixo, goals }: { eixo: Eixo; goals: EixoGoal[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section aria-labelledby="metas-gestao" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle id="metas-gestao">Metas do eixo</SectionTitle>
        {editing !== "new" && (
          <Button type="button" size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> Nova meta
          </Button>
        )}
      </div>
      <Card className="space-y-3">
        {error && <Alert tone="danger">{error}</Alert>}
        {editing === "new" && <GoalForm eixo={eixo} onDone={() => setEditing(null)} />}
        {goals.length === 0 && editing !== "new" ? (
          <EmptyState icon={Target} title="Nenhuma meta cadastrada">
            Crie metas com prazo para acompanhar o eixo na visão geral.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/70">
            {goals.map((g) =>
              editing === g.id ? (
                <li key={g.id} className="py-3">
                  <GoalForm eixo={eixo} goal={g} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Target className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-950">{g.title}</span>
                    <span className="block text-xs text-ink-subtle">Prazo · {formatShortDate(g.deadline)}</span>
                  </span>
                  <Badge tone={ACTIVITY_STATUS_TONE[g.status]}>{ACTIVITY_STATUS_LABEL[g.status]}</Badge>
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(g.id)}
                      aria-label={`Editar meta ${g.title}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <ConfirmButton
                      aria-label={`Excluir meta ${g.title}`}
                      onConfirm={async () => {
                        setError(null);
                        const result = await deleteGoalAction(g.id);
                        if (!result.ok) setError(result.error);
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </ConfirmButton>
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>
    </section>
  );
}
