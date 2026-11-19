import { z } from "zod";
import type { ActionResult } from "@/types";

/**
 * Helpers de validação compartilhados entre formulários (cliente) e Server Actions (servidor).
 * Não coloque "use client" aqui.
 */

/** Converte o erro do Zod em { campo: "mensagem" } para os componentes de formulário. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Lê um FormData mantendo campos repetidos (ex.: checkboxes) como array. */
export function formDataToObject(formData: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    const prev = out[key];
    out[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}

/** Campo que pode vir como valor único, array ou ausente → sempre array de strings. */
export const stringArray = z.preprocess(
  (v) => (v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.string()),
);

/** Data no formato do <input type="date"> (AAAA-MM-DD). */
export const isoDate = (message: string) => z.string({ error: message }).regex(/^\d{4}-\d{2}-\d{2}$/, message);

/** Texto opcional: "" vira undefined. */
export const optionalText = (max: number, message: string) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max, message).optional());

/** Resultado padrão quando o schema falha (Server Actions revalidam tudo que vem do cliente). */
export function invalidResult(error: z.ZodError): ActionResult {
  return { ok: false, error: "Verifique os campos destacados.", fieldErrors: fieldErrors(error) };
}

/** id opcional vindo de <select>: "" vira undefined. */
export const optionalId = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().optional());
