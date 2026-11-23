import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type DbOrTx, db, newId } from "@/db";
import { scoreEntries, user } from "@/db/schema";
import type { ActionResult, Member, ScoreEntry, ScoreSource } from "@/types";
import { canManageMemberScore, canViewMemberScore } from "../access";
import { notify } from "./notifications";
import { denied, notFound, toMember } from "./shared";

const memberColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  eixo: user.eixo,
  time: user.time,
};

/** Carrega o membro (opcionalmente travando a linha na transação para atualizar a pontuação). */
export async function loadMember(dbx: DbOrTx, memberId: string, lock = false): Promise<Member | null> {
  const query = dbx.select(memberColumns).from(user).where(eq(user.id, memberId)).limit(1);
  const [row] = lock ? await query.for("update") : await query;
  return row ? toMember(row) : null;
}

/**
 * Único ponto que altera pontuação: grava o lançamento e atualiza `user.score` na MESMA transação,
 * mantendo `user.score = SUM(score_entries.delta)`. Chame sempre dentro de `db.transaction`.
 */
export async function addScoreEntry(
  tx: DbOrTx,
  entry: {
    memberId: string;
    delta: number;
    source: ScoreSource;
    reason: string;
    activityId?: string | null;
    createdBy: string | null;
  },
) {
  if (entry.delta === 0) return;
  await tx.insert(scoreEntries).values({
    id: newId("se"),
    memberId: entry.memberId,
    delta: entry.delta,
    source: entry.source,
    reason: entry.reason,
    activityId: entry.activityId ?? null,
    createdBy: entry.createdBy,
  });
  await tx
    .update(user)
    .set({ score: sql`${user.score} + ${entry.delta}` })
    .where(eq(user.id, entry.memberId));

  await notify(
    tx,
    [entry.memberId],
    {
      type: "pontos",
      title: entry.delta > 0 ? `+${entry.delta} pontos` : `${entry.delta} pontos`,
      body: entry.reason,
      href: "/atividades",
    },
    entry.createdBy,
  );
}

export type ScoreHistory = { member: Member; score: number; entries: ScoreEntry[]; canManage: boolean };

/** Pontuação atual + histórico de um membro. Null = sem acesso ou inexistente. */
export async function getScoreHistory(viewer: Member, memberId: string): Promise<ScoreHistory | null> {
  const member = await loadMember(db, memberId);
  if (!member || !canViewMemberScore(viewer, member)) return null;

  const author = alias(user, "author");
  const [[current], rows] = await Promise.all([
    db.select({ score: user.score }).from(user).where(eq(user.id, memberId)),
    db
      .select({
        id: scoreEntries.id,
        delta: scoreEntries.delta,
        source: scoreEntries.source,
        reason: scoreEntries.reason,
        activityId: scoreEntries.activityId,
        createdByName: author.name,
        createdAt: scoreEntries.createdAt,
      })
      .from(scoreEntries)
      .leftJoin(author, eq(scoreEntries.createdBy, author.id))
      .where(eq(scoreEntries.memberId, memberId))
      .orderBy(desc(scoreEntries.createdAt), desc(scoreEntries.id)),
  ]);

  return {
    member,
    score: current?.score ?? 0,
    entries: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    canManage: canManageMemberScore(viewer, member),
  };
}

/** Ajuste manual de pontos (com motivo). Não deixa a pontuação total negativa. */
export async function adjustScore(
  viewer: Member,
  memberId: string,
  input: { delta: number; reason: string },
): Promise<ActionResult> {
  const reason = input.reason.trim();
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    return {
      ok: false,
      error: "Informe um ajuste diferente de zero.",
      fieldErrors: { delta: "Use um número inteiro." },
    };
  }
  if (!reason) return { ok: false, error: "Explique o motivo do ajuste.", fieldErrors: { reason: "Obrigatório." } };

  return db.transaction(async (tx) => {
    const member = await loadMember(tx, memberId, true);
    if (!member) return notFound("Membro");
    if (!canManageMemberScore(viewer, member)) return denied();

    const [row] = await tx.select({ score: user.score }).from(user).where(eq(user.id, memberId));
    if ((row?.score ?? 0) + input.delta < 0) {
      return {
        ok: false,
        error: `O ajuste deixaria a pontuação negativa (atual: ${row?.score ?? 0}).`,
        fieldErrors: { delta: "Valor maior que a pontuação atual." },
      };
    }

    await addScoreEntry(tx, { memberId, delta: input.delta, source: "ajuste", reason, createdBy: viewer.id });
    return { ok: true };
  });
}
