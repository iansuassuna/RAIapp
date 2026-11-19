"use server";

import { revalidatePath } from "next/cache";
import { createRequest, resolveRequest } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { requestSchema, resolveSchema } from "./schemas";

export async function createRequestAction(input: unknown): Promise<ActionResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  const result = await createRequest(await getCurrentMember(), parsed.data);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function resolveRequestAction(requestId: string, input: unknown): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  const result = await resolveRequest(await getCurrentMember(), requestId, parsed.data.decision, parsed.data.note ?? "");
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
