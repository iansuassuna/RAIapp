import type { Eixo, EixoMember, EixoMemberRole, Member } from "@/types";
import { canViewEixo } from "../access";
import { getDb } from "../db";
import { mockMemberScores } from "../mock-data";

export async function getMember(id: string) {
  return getDb().members.find((m) => m.id === id) ?? null;
}

/** Nome de um membro (ou "Membro removido"). */
export function memberName(id: string | null) {
  if (!id) return "Sem responsável";
  return getDb().members.find((m) => m.id === id)?.name ?? "Membro removido";
}

/** Todos os membros associados a um eixo, com pontuação, ou null sem acesso. */
export async function getEixoMembers(viewer: Member, eixo: Eixo): Promise<EixoMember[] | null> {
  if (!canViewEixo(viewer, eixo)) return null;
  return getDb()
    .members.filter((m): m is EixoMemberRole => m.eixo === eixo)
    .map((m) => {
      const score = mockMemberScores[m.id] ?? 0;
      return { ...m, score, standing: score >= 60 ? ("em-dia" as const) : ("atencao" as const) };
    })
    .sort((a, b) => b.score - a.score);
}

/** Membros a partir de uma lista de ids (mantém a ordem da lista). */
export async function getMembersByIds(ids: string[]) {
  const db = getDb();
  return ids.map((id) => db.members.find((m) => m.id === id)).filter((m): m is Member => !!m);
}
