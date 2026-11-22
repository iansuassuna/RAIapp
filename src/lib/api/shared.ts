import { isEixo, isTime } from "@/config/options";
import type { ActionResult, Member } from "@/types";

export const denied = (): ActionResult => ({ ok: false, error: "Você não tem permissão para fazer isso." });
export const notFound = (what: string): ActionResult => ({ ok: false, error: `${what} não encontrado(a).` });

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
  eixo: string | null;
  time: string | null;
};

/** Converte registro do banco / Better Auth na união discriminada `Member`. */
export function toMember(row: UserRecord): Member | null {
  const base = {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.image ?? undefined,
  };
  if (row.role === "diretoria") {
    return { ...base, role: "diretoria", eixo: null, time: null };
  }
  if (row.role === "coordenador" && isEixo(row.eixo)) {
    return { ...base, role: "coordenador", eixo: row.eixo, time: null };
  }
  if (row.role === "membro" && isEixo(row.eixo) && isTime(row.time)) {
    return { ...base, role: "membro", eixo: row.eixo, time: row.time };
  }
  return null;
}
