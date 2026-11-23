"use server";

import { runAuthenticatedAction } from "@/lib/action-helpers";
import { submitEvaluation } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { evaluationSchema, toEvaluationInput } from "./schemas";

/** `cycleId`: ciclo exibido no formulário — se já encerrou, o envio é recusado com aviso. */
export async function submitEvaluationAction(
  evaluateeId: string,
  cycleId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = evaluationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) =>
    submitEvaluation(viewer, evaluateeId, { ...toEvaluationInput(parsed.data), cycleId: String(cycleId) }),
  );
}
