"use client";

import { Check, MessageSquareText, PlusCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { adjustScoreAction } from "../actions";
import { scoreAdjustmentSchema } from "../schemas";

/** Ajuste manual de pontos (positivo ou negativo) com motivo obrigatório. */
export function ScoreAdjustForm({ memberId }: { memberId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    scoreAdjustmentSchema,
    async (data) => {
      setSaved(null);
      const result = await adjustScoreAction(memberId, data);
      if (result.ok) {
        formRef.current?.reset();
        setSaved(data.delta);
      }
      return result;
    },
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-3">
      {formError && <Alert tone="danger">{formError}</Alert>}
      {saved !== null && (
        <Alert tone="success">Ajuste de {saved > 0 ? `+${saved}` : saved} pontos lançado no histórico.</Alert>
      )}
      <Input
        id="score-delta"
        name="delta"
        type="number"
        inputMode="numeric"
        min={-100}
        max={100}
        label="Pontos (use negativo para descontar)"
        icon={PlusCircle}
        placeholder="Ex.: 5 ou -5"
        error={errors.delta}
      />
      <Textarea
        id="score-reason"
        name="reason"
        label="Motivo"
        icon={MessageSquareText}
        rows={2}
        maxLength={200}
        placeholder="Ex.: Organizou a feira de ciências"
        error={errors.reason}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <Check className="size-4" aria-hidden /> Lançar ajuste
        </Button>
      </div>
    </form>
  );
}
