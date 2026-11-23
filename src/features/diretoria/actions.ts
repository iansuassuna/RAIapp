"use server";

import { runAuthenticatedAction } from "@/lib/action-helpers";
import { updateEvaluationCycle, updateMemberRole } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { cyclePeriodSchema, memberRoleSchema } from "./schemas";

export async function updateMemberRoleAction(targetMemberId: string, input: unknown): Promise<ActionResult> {
  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => updateMemberRole(viewer, targetMemberId, parsed.data));
}

export async function updateCycleAction(cycleId: string, input: unknown): Promise<ActionResult> {
  const parsed = cyclePeriodSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => updateEvaluationCycle(viewer, String(cycleId), parsed.data));
}
