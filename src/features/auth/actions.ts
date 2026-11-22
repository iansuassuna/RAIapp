"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { loginSchema, registerSchema } from "./schemas";

function translateAuthError(error: unknown, fallback: string): string {
  if (error instanceof APIError) {
    const code = String((error.body as { code?: string } | undefined)?.code ?? "");
    if (code === "INVALID_EMAIL_OR_PASSWORD" || error.status === "UNAUTHORIZED") {
      return "E-mail ou senha inválidos.";
    }
    if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return "Já existe uma conta cadastrada com este e-mail.";
    }
    if (code === "PASSWORD_TOO_SHORT") {
      return "A senha precisa ter ao menos 8 caracteres.";
    }
    if (error.message) return error.message;
  }
  return fallback;
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: await headers(),
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateAuthError(error, "Não foi possível entrar. Verifique seus dados.") };
  }
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        eixo: parsed.data.eixo,
        time: parsed.data.time,
      },
      headers: await headers(),
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    const message = translateAuthError(error, "Não foi possível criar sua conta.");
    const isDuplicateEmail = message.includes("e-mail");
    return {
      ok: false,
      error: message,
      fieldErrors: isDuplicateEmail ? { email: "E-mail já cadastrado." } : undefined,
    };
  }
}
