"use server";

import { runAuthenticatedAction } from "@/lib/action-helpers";
import { createInventoryItem, deleteInventoryItem, resolveProposal, updateInventoryItem } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { inventoryItemSchema, proposalDecisionSchema } from "./schemas";

/**
 * Coordenação/diretoria aplicam direto; time Processos gera proposta (`pending: true`).
 * A decisão de qual caminho seguir fica em lib/api.
 */
export async function createInventoryItemAction(input: unknown): Promise<ActionResult> {
  const parsed = inventoryItemSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => createInventoryItem(viewer, parsed.data));
}

export async function updateInventoryItemAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = inventoryItemSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => updateInventoryItem(viewer, id, parsed.data));
}

export async function deleteInventoryItemAction(id: string): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => deleteInventoryItem(viewer, id));
}

export async function resolveProposalAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = proposalDecisionSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => resolveProposal(viewer, id, parsed.data.decision, parsed.data.note ?? ""));
}
