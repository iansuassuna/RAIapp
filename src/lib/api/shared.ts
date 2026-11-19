import type { ActionResult } from "@/types";

export const denied = (): ActionResult => ({ ok: false, error: "Você não tem permissão para fazer isso." });
export const notFound = (what: string): ActionResult => ({ ok: false, error: `${what} não encontrado(a).` });
