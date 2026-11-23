"use server";

import { isEixo } from "@/config/options";
import { runAuthenticatedAction } from "@/lib/action-helpers";
import { createEixoGoal, deleteEixoGoal, updateEixoGoal } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { goalSchema } from "./schemas";

export async function createGoalAction(eixo: string, input: unknown): Promise<ActionResult> {
  if (!isEixo(eixo)) return { ok: false, error: "Eixo inválido." };
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => createEixoGoal(viewer, eixo, parsed.data));
}

export async function updateGoalAction(goalId: string, input: unknown): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => updateEixoGoal(viewer, String(goalId), parsed.data));
}

export async function deleteGoalAction(goalId: string): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => deleteEixoGoal(viewer, String(goalId)));
}
