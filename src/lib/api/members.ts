import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { isEixo, isTime, SCORE_ATTENTION_THRESHOLD } from "@/config/options";
import { db } from "@/db";
import { projectMembers, projects, tasks, user } from "@/db/schema";
import type { ActionResult, Eixo, EixoMember, EixoMemberRole, Member, Role, Time } from "@/types";
import { canManageMemberRoles, canViewEixo } from "../access";
import { denied, notFound, toMember } from "./shared";

export type MemberRoleInput = {
  role: Role;
  eixo: Eixo | null;
  time: Time | null;
};

export async function getMember(id: string): Promise<Member | null> {
  const [row] = await db
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
    .where(eq(user.id, id))
    .limit(1);
  return row ? toMember(row) : null;
}

/** Lista todos os membros do sistema (somente diretoria — tela de gestão de papéis). */
export async function getAllMembers(viewer: Member): Promise<Member[] | null> {
  if (!canManageMemberRoles(viewer)) return null;
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

/** Todos os membros associados a um eixo, com pontuação, ou null sem acesso. */
export async function getEixoMembers(viewer: Member, eixo: Eixo): Promise<EixoMember[] | null> {
  if (!canViewEixo(viewer, eixo)) return null;
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      eixo: user.eixo,
      time: user.time,
      score: user.score,
    })
    .from(user)
    .where(eq(user.eixo, eixo))
    .orderBy(desc(user.score), asc(user.name));

  return rows.flatMap((row): EixoMember[] => {
    const member = toMember(row);
    if (!member || member.role === "diretoria") return [];
    const standing = row.score >= SCORE_ATTENTION_THRESHOLD ? ("em-dia" as const) : ("atencao" as const);
    return [{ ...(member as EixoMemberRole), score: row.score, standing }];
  });
}

/** Membros a partir de uma lista de ids (mantém a ordem da lista). */
export async function getMembersByIds(ids: string[]): Promise<Member[]> {
  if (ids.length === 0) return [];
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
    .where(inArray(user.id, ids));
  const byId = new Map(rows.map((r) => [r.id, toMember(r)]));
  return ids.map((id) => byId.get(id)).filter((m): m is Member => Boolean(m));
}

/**
 * Atualiza papel, eixo e time de um membro (exclusivo da diretoria).
 * Impõe as invariantes do domínio, unicidade de coordenador por eixo,
 * proteção do último diretor e limpeza de vínculos de projetos ao mudar de eixo.
 */
export async function updateMemberRole(
  viewer: Member,
  targetMemberId: string,
  input: MemberRoleInput,
): Promise<ActionResult> {
  if (!canManageMemberRoles(viewer)) return denied();

  let nextEixo: Eixo | null = null;
  let nextTime: Time | null = null;

  if (input.role === "membro") {
    if (!isEixo(input.eixo)) {
      return { ok: false, error: "Selecione um eixo válido.", fieldErrors: { eixo: "Selecione o eixo." } };
    }
    if (!isTime(input.time)) {
      return { ok: false, error: "Selecione um time válido.", fieldErrors: { time: "Selecione o time." } };
    }
    nextEixo = input.eixo;
    nextTime = input.time;
  } else if (input.role === "coordenador") {
    if (!isEixo(input.eixo)) {
      return { ok: false, error: "Selecione o eixo que será coordenado.", fieldErrors: { eixo: "Selecione o eixo." } };
    }
    nextEixo = input.eixo;
    nextTime = null;
  } else {
    nextEixo = null;
    nextTime = null;
  }

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id, role: user.role, eixo: user.eixo })
      .from(user)
      .where(eq(user.id, targetMemberId))
      .limit(1);
    if (!target) return notFound("Membro");

    if (target.role === "diretoria" && input.role !== "diretoria") {
      const otherDirectors = await tx
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.role, "diretoria"), ne(user.id, targetMemberId)));
      if (otherDirectors.length === 0) {
        return { ok: false, error: "Não é possível remover o papel da última pessoa na diretoria." };
      }
    }

    if (input.role === "coordenador" && nextEixo) {
      const [existingCoordinator] = await tx
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(and(eq(user.role, "coordenador"), eq(user.eixo, nextEixo), ne(user.id, targetMemberId)))
        .limit(1);
      if (existingCoordinator) {
        return {
          ok: false,
          error: `Este eixo já é coordenado por ${existingCoordinator.name}. Altere o papel dele(a) primeiro.`,
          fieldErrors: { eixo: "Já existe coordenador neste eixo." },
        };
      }
    }

    await tx
      .update(user)
      .set({
        role: input.role,
        eixo: nextEixo,
        time: nextTime,
        updatedAt: new Date(),
      })
      .where(eq(user.id, targetMemberId));

    // Se o membro saiu do eixo anterior, remove vínculo com projetos daquele eixo e limpa tarefas atribuídas.
    if (target.eixo && target.eixo !== nextEixo) {
      const oldProjects = await tx.select({ id: projects.id }).from(projects).where(eq(projects.eixo, target.eixo));
      const oldProjectIds = oldProjects.map((p) => p.id);
      if (oldProjectIds.length > 0) {
        await tx
          .delete(projectMembers)
          .where(and(eq(projectMembers.memberId, targetMemberId), inArray(projectMembers.projectId, oldProjectIds)));
        await tx
          .update(tasks)
          .set({ assigneeId: null })
          .where(and(eq(tasks.assigneeId, targetMemberId), inArray(tasks.projectId, oldProjectIds)));
      }
    }

    return { ok: true, id: targetMemberId };
  });
}
