import "server-only";
import { asc } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { user } from "@/db/schema";
import { isPendingEmailVerification } from "@/lib/access";
import { toMember } from "@/lib/api/shared";
import { auth } from "@/lib/auth";
import { isDevQuickSwitchEnabled } from "@/lib/dev-auth";
import type { Member } from "@/types";

export type SessionState =
  | { status: "anonymous" }
  | { status: "unverified"; email: string; name: string }
  | { status: "active"; member: Member; sessionId: string };

/**
 * Estado da sessão real do Better Auth, deduplicado por requisição via `React.cache()`.
 * `unverified`: conta criada pelo cadastro novo (`verificationRequired`) que ainda não confirmou o e-mail —
 * tem sessão, mas não acessa o app nem executa Server Actions até verificar.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const current = await auth.api.getSession({ headers: await requestHeadersWithCurrentCookies() });
  if (!current?.user) return { status: "anonymous" };

  if (isPendingEmailVerification(current.user)) {
    return { status: "unverified", email: current.user.email, name: current.user.name };
  }

  const member = toMember({
    id: current.user.id,
    name: current.user.name,
    email: current.user.email,
    image: current.user.image,
    role: String(current.user.role ?? "membro"),
    eixo: current.user.eixo ? String(current.user.eixo) : null,
    time: current.user.time ? String(current.user.time) : null,
  });
  return member ? { status: "active", member, sessionId: current.session.id } : { status: "anonymous" };
});

/**
 * Cabeçalhos da requisição com os cookies ATUAIS. Quando uma Server Action grava um cookie novo (ex.: troca de
 * senha com revogação de sessões emite uma sessão nova), o Next re-renderiza a página na mesma resposta:
 * `headers()` ainda traz o cookie original (já revogado), mas `cookies()` reflete o que acabou de ser gravado.
 */
async function requestHeadersWithCurrentCookies() {
  const merged = new Headers(await headers());
  const cookieHeader = (await cookies()).toString();
  if (cookieHeader) merged.set("cookie", cookieHeader);
  else merged.delete("cookie");
  return merged;
}

/** Membro autenticado e liberado (e-mail verificado quando exigido), ou `null`. */
export async function getSessionMember(): Promise<Member | null> {
  const state = await getSessionState();
  return state.status === "active" ? state.member : null;
}

/** Exige sessão válida em rotas autenticadas de `(app)`. Conta nova sem e-mail verificado vai para `/verificar-email`. */
export async function getCurrentMember(): Promise<Member> {
  const state = await getSessionState();
  if (state.status === "unverified") redirect("/verificar-email");
  if (state.status === "anonymous") redirect("/login");
  return state.member;
}

/**
 * Lista usuários reais do banco para o seletor rápido de dev.
 * Retorna lista vazia se `DEV_QUICK_SWITCH` não estiver ativo ou em produção.
 */
export async function getDevQuickSwitchMembers(): Promise<Member[]> {
  if (!isDevQuickSwitchEnabled()) return [];
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      eixo: user.eixo,
      time: user.time,
    })
    .from(user)
    .orderBy(asc(user.name));
  return rows.map(toMember).filter((m): m is Member => m !== null);
}
