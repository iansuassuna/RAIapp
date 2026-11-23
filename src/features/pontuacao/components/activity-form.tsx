"use client";

import { CalendarDays, Check, Flag, Shapes, Star, Type } from "lucide-react";
import { Alert, Button, Input, Select } from "@/components/ui";
import {
  ACTIVITY_MAX_POINTS,
  ACTIVITY_STATUS_LABEL,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPE_LABEL,
  ACTIVITY_TYPES,
} from "@/config/options";
import { useFormSubmit } from "@/lib/form";
import { todayIso } from "@/lib/format";
import type { MemberActivity } from "@/types";
import { createActivityAction, updateActivityAction } from "../actions";
import { activitySchema } from "../schemas";

type Props = {
  /** Membro dono (criação) — ignorado na edição. */
  memberId: string;
  /** Atividade existente: o formulário edita em vez de criar. */
  activity?: MemberActivity;
  onDone: () => void;
  onCancel: () => void;
};

const typeOptions = ACTIVITY_TYPES.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABEL[t] }));
const statusOptions = ACTIVITY_STATUSES.map((s) => ({ value: s, label: ACTIVITY_STATUS_LABEL[s] }));

export function ActivityForm({ memberId, activity, onDone, onCancel }: Props) {
  const prefix = activity ? `activity-${activity.id}` : "activity-new";
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(activitySchema, async (data) => {
    const result = activity
      ? await updateActivityAction(activity.id, data)
      : await createActivityAction(memberId, data);
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
        label="Atividade"
        icon={Type}
        placeholder="Ex.: Capacitação de Arduino"
        defaultValue={activity?.title}
        maxLength={120}
        error={errors.title}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          id={`${prefix}-type`}
          name="type"
          label="Tipo"
          icon={Shapes}
          placeholder="Escolha o tipo..."
          options={typeOptions}
          defaultValue={activity?.type ?? "capacitacao"}
          error={errors.type}
        />
        <Input
          id={`${prefix}-date`}
          name="date"
          type="date"
          label="Data"
          icon={CalendarDays}
          defaultValue={activity?.date ?? todayIso()}
          error={errors.date}
        />
        <Select
          id={`${prefix}-status`}
          name="status"
          label="Status"
          icon={Flag}
          placeholder="Escolha o status..."
          options={statusOptions}
          defaultValue={activity?.status ?? "concluida"}
          error={errors.status}
        />
        <Input
          id={`${prefix}-points`}
          name="points"
          type="number"
          inputMode="numeric"
          min={0}
          max={ACTIVITY_MAX_POINTS}
          label="Pontos"
          icon={Star}
          defaultValue={activity?.points ?? 10}
          hint="Só contam quando a atividade está concluída."
          error={errors.points}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          <Check className="size-4" aria-hidden /> {activity ? "Salvar atividade" : "Registrar atividade"}
        </Button>
      </div>
    </form>
  );
}
