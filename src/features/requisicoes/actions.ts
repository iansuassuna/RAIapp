"use server";

import { requestReviewerFor } from "@/lib/access";
import { runAuthenticatedAction } from "@/lib/action-helpers";
import { advanceRequest, completePurchase, createRequest, resolveRequest } from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult, RequestProgress } from "@/types";
import { directorRequestSchema, memberRequestSchema, purchaseSchema, resolveSchema } from "./schemas";

/** Valida com o schema certo para quem pede: membro (tipos) ou coordenador (pedido à diretoria). */
export async function createRequestAction(input: unknown): Promise<ActionResult> {
  return runAuthenticatedAction(async (viewer) => {
    const reviewer = requestReviewerFor(viewer);
    if (!reviewer) return { ok: false, error: "A diretoria não faz requisições." };
    const parsed = (reviewer === "diretoria" ? directorRequestSchema : memberRequestSchema).safeParse(input);
    if (!parsed.success) return invalidResult(parsed.error);
    return createRequest(viewer, parsed.data);
  });
}

export async function resolveRequestAction(requestId: string, input: unknown): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) =>
    resolveRequest(viewer, requestId, parsed.data.decision, parsed.data.note ?? ""),
  );
}

/** `to` é validado em lib/api contra o ciclo do tipo. */
export async function advanceRequestAction(requestId: string, to: RequestProgress): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => advanceRequest(viewer, requestId, to));
}

export async function completePurchaseAction(requestId: string, input: unknown): Promise<ActionResult> {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => completePurchase(viewer, requestId, parsed.data));
}
