import { and, desc, eq, sql } from "drizzle-orm";
import { type DbOrTx, db, newId } from "@/db";
import { activities, scoreEntries } from "@/db/schema";
import type { ActionResult, ActivityStatus, ActivityType, Member, MemberActivity } from "@/types";
import { canManageMemberScore, canViewMemberScore } from "../access";
import { addScoreEntry, loadMember } from "./scores";
import { denied, notFound } from "./shared";

export type ActivityInput = {
  title: string;
  type: ActivityType;
  date: string;
  status: ActivityStatus;
  points: number;
};

const activityColumns = {
  id: activities.id,
  memberId: activities.memberId,
  title: activities.title,
  type: activities.type,
  date: activities.date,
  status: activities.status,
  points: activities.points,
};

/** Pontos que a atividade deve render: só quando concluída. */
function creditFor(activity: { status: ActivityStatus; points: number }) {
  return activity.status === "concluida" ? activity.points : 0;
}

/** Quanto esta atividade já creditou ao membro (soma dos lançamentos ligados a ela). */
async function creditedFor(tx: DbOrTx, activityId: string, memberId: string) {
  const [row] = await tx
    .select({ total: sql<number>`coalesce(sum(${scoreEntries.delta}), 0)::int` })
    .from(scoreEntries)
    .where(and(eq(scoreEntries.activityId, activityId), eq(scoreEntries.memberId, memberId)));
  return row?.total ?? 0;
}

/**
 * Lança a diferença entre o que a atividade deve render e o que já creditou. Idempotente: chamar de novo
 * sem mudanças não gera lançamento. Cobre conclusão, reabertura, mudança de pontos e exclusão (desired=0).
 */
async function syncActivityCredit(
  tx: DbOrTx,
  activity: { id: string; memberId: string; title: string },
  desired: number,
  actorId: string,
  reason: string,
) {
  const diff = desired - (await creditedFor(tx, activity.id, activity.memberId));
  await addScoreEntry(tx, {
    memberId: activity.memberId,
    delta: diff,
    source: "atividade",
    activityId: activity.id,
    reason: `${reason}: ${activity.title}`,
    createdBy: actorId,
  });
}

/** Atividades de um membro (mais recentes primeiro). Null = sem acesso ou inexistente. */
export async function getMemberActivities(viewer: Member, memberId: string): Promise<MemberActivity[] | null> {
  const member = await loadMember(db, memberId);
  if (!member || !canViewMemberScore(viewer, member)) return null;
  const rows = await db
    .select(activityColumns)
    .from(activities)
    .where(eq(activities.memberId, memberId))
    .orderBy(desc(activities.date), desc(activities.createdAt));
  return rows.map((r) => ({ ...r, memberId }));
}

export async function createActivity(viewer: Member, memberId: string, input: ActivityInput): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const member = await loadMember(tx, memberId, true);
    if (!member) return notFound("Membro");
    if (!canManageMemberScore(viewer, member)) return denied();

    const id = newId("a");
    await tx.insert(activities).values({ id, memberId, ...input, title: input.title.trim(), createdBy: viewer.id });
    await syncActivityCredit(
      tx,
      { id, memberId, title: input.title.trim() },
      creditFor(input),
      viewer.id,
      "Atividade concluída",
    );
    return { ok: true, id };
  });
}

/** Edita a atividade e ajusta os pontos pela diferença (ex.: concluir, reabrir, mudar pontos). */
export async function updateActivity(viewer: Member, activityId: string, input: ActivityInput): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select(activityColumns)
      .from(activities)
      .where(eq(activities.id, activityId))
      .for("update");
    if (!current?.memberId) return notFound("Atividade");
    const member = await loadMember(tx, current.memberId, true);
    if (!member) return notFound("Membro");
    if (!canManageMemberScore(viewer, member)) return denied();

    const title = input.title.trim();
    await tx
      .update(activities)
      .set({ ...input, title })
      .where(eq(activities.id, activityId));
    await syncActivityCredit(
      tx,
      { id: activityId, memberId: member.id, title },
      creditFor(input),
      viewer.id,
      "Ajuste da atividade",
    );
    return { ok: true, id: activityId };
  });
}

/** Exclui a atividade estornando os pontos já creditados (o histórico permanece). */
export async function deleteActivity(viewer: Member, activityId: string): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select(activityColumns)
      .from(activities)
      .where(eq(activities.id, activityId))
      .for("update");
    if (!current?.memberId) return notFound("Atividade");
    const member = await loadMember(tx, current.memberId, true);
    if (!member) return notFound("Membro");
    if (!canManageMemberScore(viewer, member)) return denied();

    await syncActivityCredit(
      tx,
      { id: activityId, memberId: member.id, title: current.title },
      0,
      viewer.id,
      "Estorno de atividade removida",
    );
    await tx.delete(activities).where(eq(activities.id, activityId));
    return { ok: true };
  });
}
