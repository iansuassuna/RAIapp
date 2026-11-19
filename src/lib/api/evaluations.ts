import { describeMember, EVALUATION_CRITERIA, EVALUATION_CYCLES } from "@/config/options";
import type { ActionResult, Eixo, EvaluationCycle, EvaluationRecord, Member } from "@/types";
import { canViewMemberEvaluations } from "../access";
import { getDb, newId } from "../db";
import { notFound } from "./shared";

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
export async function getEvaluationCycle(viewer: Member): Promise<EvaluationCycle> {
  const db = getDb();
  const colleagues = db.members
    .filter((m) => m.id !== viewer.id)
    .map(({ id, name, eixo, time, role }) => ({ id, name, eixo, time, role }));
  const submitted = Object.fromEntries(
    db.evaluations
      .filter((r) => r.cycle === EVALUATION_CYCLES.current && r.evaluatorId === viewer.id)
      .map((r) => [r.evaluateeId, { ratings: r.ratings, comment: r.comment }]),
  );
  const received = averageByCriterion(
    db.evaluations.filter((r) => r.cycle === EVALUATION_CYCLES.previous && r.evaluateeId === viewer.id),
  );
  return { label: EVALUATION_CYCLES.current, criteria: EVALUATION_CRITERIA, colleagues, submitted, received };
}

/** Envia (ou atualiza) a avaliação do membro sobre um colega no ciclo atual. */
export async function submitEvaluation(
  viewer: Member,
  evaluateeId: string,
  input: { ratings: Record<string, number>; comment: string },
): Promise<ActionResult> {
  const db = getDb();
  if (evaluateeId === viewer.id) return { ok: false, error: "Você não pode se autoavaliar." };
  if (!db.members.some((m) => m.id === evaluateeId)) return notFound("Colega");

  const existing = db.evaluations.find(
    (r) => r.cycle === EVALUATION_CYCLES.current && r.evaluatorId === viewer.id && r.evaluateeId === evaluateeId,
  );
  const now = new Date().toISOString();
  if (existing) {
    Object.assign(existing, { ratings: input.ratings, comment: input.comment, submittedAt: now });
    return { ok: true, id: existing.id };
  }
  const record: EvaluationRecord = {
    id: newId("e"),
    cycle: EVALUATION_CYCLES.current,
    evaluatorId: viewer.id,
    evaluateeId,
    ratings: input.ratings,
    comment: input.comment,
    submittedAt: now,
  };
  db.evaluations.push(record);
  return { ok: true, id: record.id };
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
export async function getMemberEvaluations(viewer: Member, memberId: string): Promise<MemberEvaluationReport | null> {
  const db = getDb();
  const member = db.members.find((m) => m.id === memberId);
  if (!member || !canViewMemberEvaluations(viewer, member)) return null;

  const cycles = [EVALUATION_CYCLES.current, EVALUATION_CYCLES.previous].map((label) => {
    const records = db.evaluations.filter((r) => r.cycle === label && r.evaluateeId === memberId);
    return {
      label,
      averages: averageByCriterion(records),
      overall: overallAverage(records),
      evaluations: records
        .map((r) => {
          const evaluator = db.members.find((m) => m.id === r.evaluatorId);
          return { ...r, evaluatorName: evaluator?.name ?? "Membro removido", evaluatorContext: evaluator ? describeMember(evaluator) : "—" };
        })
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    };
  });
  return { member, cycles };
}

/** Média geral da avaliação cruzada recebida pelos membros de um eixo no ciclo anterior. */
export function eixoEvaluationAverage(eixo: Eixo) {
  const db = getDb();
  const ids = new Set(db.members.filter((m) => m.eixo === eixo).map((m) => m.id));
  return overallAverage(db.evaluations.filter((r) => r.cycle === EVALUATION_CYCLES.previous && ids.has(r.evaluateeId)));
}

