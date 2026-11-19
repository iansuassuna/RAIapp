"use server";

import { revalidatePath } from "next/cache";
import { advanceRequest, completePurchase, createRequest, resolveRequest } from "@/lib/api";
import { requestReviewerFor } from "@/lib/access";
import { getCurrentMember } from "@/lib/session";
import { invalidResult } from "@/lib/validation";
import type { ActionResult, RequestProgress } from "@/types";
import { directorRequestSchema, memberRequestSchema, purchaseSchema, resolveSchema } from "./schemas";

function done(result: ActionResult) {
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Valida com o schema certo para quem pede: membro (tipos) ou coordenador (pedido à diretoria). */
export async function createRequestAction(input: unknown): Promise<ActionResult> {
  const viewer = await getCurrentMember();
  const reviewer = requestReviewerFor(viewer);
  if (!reviewer) return { ok: false, error: "A diretoria não faz requisições." };
  const parsed = (reviewer === "diretoria" ? directorRequestSchema : memberRequestSchema).safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await createRequest(viewer, parsed.data));
}

export async function resolveRequestAction(requestId: string, input: unknown): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await resolveRequest(await getCurrentMember(), requestId, parsed.data.decision, parsed.data.note ?? ""));
}

/** `to` é validado em lib/api contra o ciclo do tipo. */
export async function advanceRequestAction(requestId: string, to: RequestProgress): Promise<ActionResult> {
  return done(await advanceRequest(await getCurrentMember(), requestId, to));
}

export async function completePurchaseAction(requestId: string, input: unknown): Promise<ActionResult> {
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await completePurchase(await getCurrentMember(), requestId, parsed.data));
}
