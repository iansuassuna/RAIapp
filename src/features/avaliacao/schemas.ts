import { z } from "zod";
import { EVALUATION_CRITERIA } from "@/config/options";
import type { EvaluationCriterion } from "@/types";

/** Monta o schema a partir dos critérios do ciclo: uma nota de 1 a 5 por critério + comentário opcional. */
export function buildEvaluationSchema(criteria: EvaluationCriterion[]) {
  const ratings = Object.fromEntries(
    criteria.map((c) => {
      const message = `Dê uma nota para ${c.label}.`;
      return [c.id, z.coerce.number({ error: message }).int().min(1, message).max(5, message)];
    }),
  );
  return z.object({
    ...ratings,
    comment: z.string().trim().max(500, "O comentário pode ter no máximo 500 caracteres.").optional(),
  });
}

export const evaluationSchema = buildEvaluationSchema(EVALUATION_CRITERIA);

export type EvaluationInput = { ratings: Record<string, number>; comment: string };

/** Separa o objeto plano do formulário em { ratings, comment }. */
export function toEvaluationInput(data: Record<string, unknown>): EvaluationInput {
  const { comment, ...ratings } = data as Record<string, number> & { comment?: string };
  return { ratings, comment: comment ?? "" };
}
