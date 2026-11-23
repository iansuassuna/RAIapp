"use server";

import { runAuthenticatedAction } from "@/lib/action-helpers";
import { adjustScore, createActivity, deleteActivity, updateActivity } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { activitySchema, scoreAdjustmentSchema } from "./schemas";

export async function createActivityAction(memberId: string, input: unknown): Promise<ActionResult> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => createActivity(viewer, String(memberId), parsed.data));
}

export async function updateActivityAction(activityId: string, input: unknown): Promise<ActionResult> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => updateActivity(viewer, String(activityId), parsed.data));
}

export async function deleteActivityAction(activityId: string): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => deleteActivity(viewer, String(activityId)));
}

export async function adjustScoreAction(memberId: string, input: unknown): Promise<ActionResult> {
  const parsed = scoreAdjustmentSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => adjustScore(viewer, String(memberId), parsed.data));
}
