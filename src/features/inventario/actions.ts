"use server";

import { revalidatePath } from "next/cache";
import { createInventoryItem, deleteInventoryItem, resolveProposal, updateInventoryItem } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { inventoryItemSchema, proposalDecisionSchema } from "./schemas";

/**
 * Coordenação/diretoria aplicam direto; time Processos gera proposta (`pending: true`).
 * A decisão de qual caminho seguir fica em lib/api.
 */
function done(result: ActionResult) {
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function createInventoryItemAction(input: unknown): Promise<ActionResult> {
  const parsed = inventoryItemSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await createInventoryItem(await getCurrentMember(), parsed.data));
}

export async function updateInventoryItemAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = inventoryItemSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await updateInventoryItem(await getCurrentMember(), id, parsed.data));
}

export async function deleteInventoryItemAction(id: string): Promise<ActionResult> {
  return done(await deleteInventoryItem(await getCurrentMember(), id));
}

export async function resolveProposalAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = proposalDecisionSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await resolveProposal(await getCurrentMember(), id, parsed.data.decision, parsed.data.note ?? ""));
}
