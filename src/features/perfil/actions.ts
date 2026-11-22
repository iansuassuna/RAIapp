"use server";

import { headers } from "next/headers";
import { runAuthenticatedAction, unauthenticated } from "@/lib/action-helpers";
import { auth } from "@/lib/auth";
import { translateAuthError } from "@/lib/auth-errors";
import { getSessionMember } from "@/lib/session";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { changeEmailSchema, changePasswordSchema, profileAvatarSchema, profileNameSchema } from "./schemas";

/** Destino dos links de troca de e-mail (as duas etapas voltam para o perfil). */
const EMAIL_CHANGE_CALLBACK = "/perfil?email=pendente";

export async function updateProfileNameAction(input: unknown): Promise<ActionResult> {
  const parsed = profileNameSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  return runAuthenticatedAction(async () => {
    try {
      await auth.api.updateUser({ body: { name: parsed.data.name }, headers: await headers() });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: translateAuthError(error, "Não foi possível salvar seu nome.") };
    }
  });
}

export async function updateProfileAvatarAction(input: unknown): Promise<ActionResult> {
  const parsed = profileAvatarSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  return runAuthenticatedAction(async () => {
    try {
      // Vazio remove o avatar (volta às iniciais).
      await auth.api.updateUser({ body: { image: parsed.data.avatarUrl || null }, headers: await headers() });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: translateAuthError(error, "Não foi possível salvar seu avatar.") };
    }
  });
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  // Sem `runAuthenticatedAction` de propósito: com `revokeOtherSessions` o Better Auth troca a sessão atual por uma
  // nova (cookie novo via `nextCookies`). Revalidar o layout nesta mesma requisição ainda usaria o cookie antigo,
  // já revogado, e mandaria o usuário para /login. Nada exibido na página muda com a troca de senha.
  if (!(await getSessionMember())) return unauthenticated();
  try {
    // Encerra as demais sessões: quem tinha a senha antiga perde o acesso nos outros aparelhos.
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    const message = translateAuthError(error, "Não foi possível trocar sua senha.");
    const wrongCurrent = message === "Senha atual incorreta.";
    return { ok: false, error: message, fieldErrors: wrongCurrent ? { currentPassword: message } : undefined };
  }
}

/** Inicia a troca de e-mail. Resposta neutra: não revela se o novo endereço já tem conta. */
export async function changeEmailAction(input: unknown): Promise<ActionResult> {
  const parsed = changeEmailSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);

  return runAuthenticatedAction(async (viewer) => {
    if (parsed.data.newEmail.toLowerCase() === viewer.email.toLowerCase()) {
      return { ok: false, error: "Este já é o seu e-mail.", fieldErrors: { newEmail: "Este já é o seu e-mail." } };
    }
    try {
      await auth.api.changeEmail({
        body: { newEmail: parsed.data.newEmail, callbackURL: EMAIL_CHANGE_CALLBACK },
        headers: await headers(),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: translateAuthError(error, "Não foi possível iniciar a troca de e-mail.") };
    }
  });
}

export async function revokeOtherSessionsAction(): Promise<ActionResult> {
  return runAuthenticatedAction(async () => {
    try {
      await auth.api.revokeOtherSessions({ headers: await headers() });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: translateAuthError(error, "Não foi possível encerrar as outras sessões.") };
    }
  });
}
