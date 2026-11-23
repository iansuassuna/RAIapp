import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { describeMember, EVALUATION_CRITERIA } from "@/config/options";
import { db, newId } from "@/db";
import { evaluations, user } from "@/db/schema";
import type { ActionResult, Eixo, EvaluationCycle, EvaluationRecord, Member } from "@/types";
import { canViewMemberEvaluations } from "../access";
import { daysBetween } from "../cycle-period";
import { todayIso } from "../format";
import { getCurrentCycle, getPreviousCycle } from "./cycles";
import { notFound, toMember } from "./shared";

function mapEvaluation(row: typeof evaluations.$inferSelect): EvaluationRecord {
  return {
    id: row.id,
    cycle: row.cycle,
    evaluatorId: row.evaluatorId,
    evaluateeId: row.evaluateeId,
    ratings: row.ratings,
    comment: row.comment,
    submittedAt: row.submittedAt.toISOString(),
  };
}

/** Média por critério de um conjunto de avaliações. */
export function averageByCriterion(records: EvaluationRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (records.length === 0) return out;
  for (const c of EVALUATION_CRITERIA) {
    out[c.id] = records.reduce((sum, r) => sum + (r.ratings[c.id] ?? 0), 0) / records.length;
  }
  return out;
}

/** Média geral (todas as notas) de um conjunto de avaliações, ou null. */
export function overallAverage(records: EvaluationRecord[]): number | null {
  const values = records.flatMap((r) => Object.values(r.ratings));
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Ciclo atual para o membro: colegas de todos os eixos (menos ele), o que já enviou e as médias recebidas. */
export async function getEvaluationCycle(viewer: Member, today: string = todayIso()): Promise<EvaluationCycle> {
  const [current, previous] = await Promise.all([getCurrentCycle(today), getPreviousCycle(today)]);
  const [colleagueRows, submittedRows, receivedRows] = await Promise.all([
    db
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
      .where(ne(user.id, viewer.id))
      .orderBy(asc(user.name)),
    db
      .select()
      .from(evaluations)
      .where(and(eq(evaluations.cycle, current.id), eq(evaluations.evaluatorId, viewer.id))),
    previous
      ? db
          .select()
          .from(evaluations)
          .where(and(eq(evaluations.cycle, previous.id), eq(evaluations.evaluateeId, viewer.id)))
      : Promise.resolve([]),
  ]);

  const colleagues = colleagueRows
    .map(toMember)
    .filter((m): m is Member => m !== null)
    .map(({ id, name, eixo, time, role }) => ({ id, name, eixo, time, role }));

  const submitted = Object.fromEntries(
    submittedRows.map((r) => [r.evaluateeId, { ratings: r.ratings, comment: r.comment }]),
  );

  const received = averageByCriterion(receivedRows.map(mapEvaluation));

  return {
    id: current.id,
    label: current.label,
    endsOn: current.endsOn,
    daysLeft: daysBetween(today, current.endsOn),
    criteria: EVALUATION_CRITERIA,
    colleagues,
    submitted,
    received,
  };
}

/**
 * Envia (ou atualiza) a avaliação do membro sobre um colega no ciclo vigente. `cycleId` é o ciclo que o
 * formulário exibia: se ele já encerrou, o envio é recusado (em vez de cair silenciosamente no ciclo novo).
 */
export async function submitEvaluation(
  viewer: Member,
  evaluateeId: string,
  input: { ratings: Record<string, number>; comment: string; cycleId?: string },
  today: string = todayIso(),
): Promise<ActionResult> {
  if (evaluateeId === viewer.id) return { ok: false, error: "Você não pode se autoavaliar." };

  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, evaluateeId)).limit(1);
  if (!target) return notFound("Colega");

  const current = await getCurrentCycle(today);
  if (input.cycleId && input.cycleId !== current.id) {
    return {
      ok: false,
      error: `Este ciclo de avaliação já encerrou. Recarregue a página para avaliar no ciclo ${current.label}.`,
    };
  }

  const now = new Date();
  const id = newId("e");
  const [saved] = await db
    .insert(evaluations)
    .values({
      id,
      cycle: current.id,
      evaluatorId: viewer.id,
      evaluateeId,
      ratings: input.ratings,
      comment: input.comment,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: [evaluations.cycle, evaluations.evaluatorId, evaluations.evaluateeId],
      set: {
        ratings: input.ratings,
        comment: input.comment,
        submittedAt: now,
      },
    })
    .returning({ id: evaluations.id });

  return { ok: true, id: saved?.id ?? id };
}

export type MemberEvaluationReport = {
  member: Member;
  cycles: {
    label: string;
    averages: Record<string, number>;
    overall: number | null;
    evaluations: (EvaluationRecord & { evaluatorName: string; evaluatorContext: string })[];
  }[];
};

/** Avaliações detalhadas recebidas por um membro (coordenação do eixo). Null = sem acesso ou não encontrado. */
export async function getMemberEvaluations(
  viewer: Member,
  memberId: string,
  today: string = todayIso(),
): Promise<MemberEvaluationReport | null> {
  const [memberRow] = await db
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
    .where(eq(user.id, memberId))
    .limit(1);
  const member = memberRow ? toMember(memberRow) : null;
  if (!member || !canViewMemberEvaluations(viewer, member)) return null;

  const [current, previous] = await Promise.all([getCurrentCycle(today), getPreviousCycle(today)]);
  const targetCycles = previous ? [current, previous] : [current];
  const rows = await db
    .select()
    .from(evaluations)
    .where(
      and(
        eq(evaluations.evaluateeId, memberId),
        inArray(
          evaluations.cycle,
          targetCycles.map((c) => c.id),
        ),
      ),
    )
    .orderBy(desc(evaluations.submittedAt));

  const evaluatorIds = [...new Set(rows.map((r) => r.evaluatorId))];
  const evaluatorRows =
    evaluatorIds.length > 0
      ? await db
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
          .where(inArray(user.id, evaluatorIds))
      : [];
  const evaluatorById = new Map(evaluatorRows.map((r) => [r.id, toMember(r)]));

  const cycles = targetCycles.map((cycle) => {
    const records = rows.filter((r) => r.cycle === cycle.id).map(mapEvaluation);
    return {
      label: cycle.label,
      averages: averageByCriterion(records),
      overall: overallAverage(records),
      evaluations: records.map((r) => {
        const evaluator = evaluatorById.get(r.evaluatorId);
        return {
          ...r,
          evaluatorName: evaluator?.name ?? "Membro removido",
          evaluatorContext: evaluator ? describeMember(evaluator) : "—",
        };
      }),
    };
  });
  return { member, cycles };
}

/** Média geral da avaliação cruzada recebida pelos membros de um eixo no ciclo anterior. */
export async function eixoEvaluationAverage(eixo: Eixo, today: string = todayIso()): Promise<number | null> {
  const previous = await getPreviousCycle(today);
  if (!previous) return null;
  const rows = await db
    .select({ evaluations })
    .from(evaluations)
    .innerJoin(user, eq(evaluations.evaluateeId, user.id))
    .where(and(eq(evaluations.cycle, previous.id), eq(user.eixo, eixo)));
  return overallAverage(rows.map((r) => mapEvaluation(r.evaluations)));
}
