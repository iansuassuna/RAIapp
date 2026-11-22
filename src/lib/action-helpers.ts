import "server-only";
import { revalidatePath } from "next/cache";
import { getSessionMember } from "@/lib/session";
import type { ActionResult, Member } from "@/types";

export const unauthenticated = (): ActionResult => ({
  ok: false,
  error: "Sua sessão expirou. Faça login novamente.",
});

/** Revalida o layout em caso de sucesso da mutação. */
export function revalidateAction(result: ActionResult): ActionResult {
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/**
 * Executa uma Server Action autenticada: verifica sessão real do Better Auth
 * e revalida o layout quando o retorno tiver `ok: true`.
 */
export async function runAuthenticatedAction(fn: (viewer: Member) => Promise<ActionResult>): Promise<ActionResult> {
  const viewer = await getSessionMember();
  if (!viewer) return unauthenticated();
  return revalidateAction(await fn(viewer));
}
