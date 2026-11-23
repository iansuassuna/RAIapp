"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "./schemas";

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
    if (code === "INVALID_TOKEN") {
      return "Este link é inválido ou expirou. Peça um novo e-mail de redefinição.";
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
        // O link de confirmação volta para cá; com sessão ativa o layout (auth) leva ao dashboard.
        callbackURL: "/verificar-email",
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

/** Resposta sempre neutra: não revela se o e-mail tem conta. */
export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: "/redefinir-senha" },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[auth] Falha ao solicitar redefinição de senha:", error instanceof Error ? error.message : error);
  }
  return { ok: true };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    // `revokeSessionsOnPasswordReset` encerra as sessões abertas da conta.
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateAuthError(error, "Não foi possível redefinir sua senha.") };
  }
}

/** Reenvia o link de confirmação. Resposta sempre neutra (não revela se o e-mail tem conta). */
export async function resendVerificationAction(input: unknown): Promise<ActionResult> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  try {
    await auth.api.sendVerificationEmail({
      body: { email: parsed.data.email, callbackURL: "/verificar-email" },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[auth] Falha ao reenviar verificação:", error instanceof Error ? error.message : error);
  }
  return { ok: true };
}
