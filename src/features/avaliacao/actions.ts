"use server";

import { runAuthenticatedAction } from "@/lib/action-helpers";
import { submitEvaluation } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { evaluationSchema, toEvaluationInput } from "./schemas";

export async function submitEvaluationAction(evaluateeId: string, input: unknown): Promise<ActionResult> {
  const parsed = evaluationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => submitEvaluation(viewer, evaluateeId, toEvaluationInput(parsed.data)));
}
