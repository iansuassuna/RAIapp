"use client";

import { ArrowLeft, MessageSquareText, Send } from "lucide-react";
import { Alert, Avatar, Button, Textarea } from "@/components/ui";
import { describeMember, RATING_SCALE } from "@/config/options";
import { useFormSubmit } from "@/lib/form";
import type { Colleague, EvaluationCriterion } from "@/types";
import { submitEvaluationAction } from "../actions";
import { buildEvaluationSchema, type EvaluationInput, toEvaluationInput } from "../schemas";
import { RatingScale } from "./rating-scale";

type Props = {
  colleague: Colleague;
  criteria: EvaluationCriterion[];
  initial?: EvaluationInput;
  onCancel: () => void;
  onSubmit: (data: EvaluationInput) => void;
};

export function EvaluationForm({ colleague, criteria, initial, onCancel, onSubmit }: Props) {
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    buildEvaluationSchema(criteria),
    async (data) => {
      const result = await submitEvaluationAction(colleague.id, data);
      if (result.ok) onSubmit(toEvaluationInput(data));
      return result;
    },
  );

  const first = RATING_SCALE[0];
  const middle = RATING_SCALE[2];
  const last = RATING_SCALE[RATING_SCALE.length - 1];

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="animate-fade-up space-y-4">
      <Button type="button" variant="link" onClick={onCancel} className="gap-1.5">
        <ArrowLeft className="size-4" /> Voltar para a lista
      </Button>

      <div className="relative overflow-hidden rounded-panel bg-brand-900 p-5 text-white shadow-raised">
        <div className="bg-circuit absolute inset-0 opacity-60" aria-hidden />
        <div className="relative flex items-center gap-4">
          <Avatar decorative name={colleague.name} className="size-14 text-base" />
          <div>
            <p className="text-xs text-brand-200">Avaliando</p>
            <p className="font-display text-xl font-bold tracking-tight">{colleague.name}</p>
            <p className="text-xs text-brand-200">{describeMember(colleague)}</p>
          </div>
        </div>
      </div>

      {formError && <Alert tone="danger">{formError}</Alert>}

      <p className="px-1 text-xs text-ink-muted">
        Escala: {first.value} = {first.label} · {middle.value} = {middle.label} · {last.value} = {last.label}
      </p>

      {criteria.map((c) => (
        <RatingScale key={c.id} criterion={c} defaultValue={initial?.ratings[c.id]} error={errors[c.id]} />
      ))}

      <Textarea
        id="comment"
        label="Comentário (opcional)"
        icon={MessageSquareText}
        placeholder="Pontos fortes e o que pode melhorar..."
        defaultValue={initial?.comment}
        maxLength={500}
        error={errors.comment}
      />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={loading} className="sm:min-w-52">
          Enviar avaliação <Send className="size-4" />
        </Button>
      </div>
    </form>
  );
}
