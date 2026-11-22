import "server-only";
import { asc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { user } from "@/db/schema";
import { toMember } from "@/lib/api/shared";
import { auth } from "@/lib/auth";
import { isDevQuickSwitchEnabled } from "@/lib/dev-auth";
import type { Member } from "@/types";

/**
 * Retorna o membro autenticado pela sessão real do Better Auth, ou `null` se anônimo.
 * Deduplicado por requisição via `React.cache()`.
 */
export const getSessionMember = cache(async (): Promise<Member | null> => {
  const current = await auth.api.getSession({ headers: await headers() });
  if (!current?.user) return null;
  return toMember({
    id: current.user.id,
    name: current.user.name,
    email: current.user.email,
    image: current.user.image,
    role: String(current.user.role ?? "membro"),
    eixo: current.user.eixo ? String(current.user.eixo) : null,
    time: current.user.time ? String(current.user.time) : null,
  });
});

/** Exige sessão válida em rotas autenticadas de `(app)`. */
export async function getCurrentMember(): Promise<Member> {
  const member = await getSessionMember();
  if (!member) redirect("/login");
  return member;
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
