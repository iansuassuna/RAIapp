"use server";

import { runAuthenticatedAction } from "@/lib/action-helpers";
import { updateMemberRole } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { memberRoleSchema } from "./schemas";

export async function updateMemberRoleAction(targetMemberId: string, input: unknown): Promise<ActionResult> {
  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => updateMemberRole(viewer, targetMemberId, parsed.data));
}
