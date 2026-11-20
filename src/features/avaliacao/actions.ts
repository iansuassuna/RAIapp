"use server";

import { revalidatePath } from "next/cache";
import { submitEvaluation } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { evaluationSchema, toEvaluationInput } from "./schemas";

export async function submitEvaluationAction(evaluateeId: string, input: unknown): Promise<ActionResult> {
  const parsed = evaluationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  const result = await submitEvaluation(await getCurrentMember(), evaluateeId, toEvaluationInput(parsed.data));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
