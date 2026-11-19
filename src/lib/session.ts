import "server-only";
import { cookies } from "next/headers";
import { mockMembers } from "./mock-data";

/**
 * Sessão TEMPORÁRIA: ainda não há autenticação. O membro "logado" vem de um cookie
 * definido pelo seletor de membro de teste no header (DevMemberSwitcher).
 * TODO: substituir pela sessão real quando houver login/backend — as regras de `lib/access.ts` não mudam.
 */
export const DEV_MEMBER_COOKIE = "raiapp-dev-member";

export async function getCurrentMember() {
  const id = (await cookies()).get(DEV_MEMBER_COOKIE)?.value;
  return mockMembers.find((m) => m.id === id) ?? mockMembers[0]!;
}

/** Membros disponíveis no seletor de teste. */
export async function getDevMembers() {
  return mockMembers;
}
