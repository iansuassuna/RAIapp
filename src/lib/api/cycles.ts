import { and, asc, desc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import { type DbOrTx, db } from "@/db";
import { evaluationCycles } from "@/db/schema";
import type { ActionResult, EvaluationCyclePeriod, Member } from "@/types";
import { canEditEvaluationCycle, canViewEvaluationCycles } from "../access";
import { autoCycleFor, periodsOverlap } from "../cycle-period";
import { todayIso } from "../format";
import { denied, notFound } from "./shared";

/** Serializa criação/edição de ciclos (evita dois ciclos automáticos concorrentes). */
const CYCLES_LOCK = sql`select pg_advisory_xact_lock(hashtext('evaluation_cycles'))`;

const cycleColumns = {
  id: evaluationCycles.id,
  label: evaluationCycles.label,
  startsOn: evaluationCycles.startsOn,
  endsOn: evaluationCycles.endsOn,
};

async function findCovering(dbx: DbOrTx, today: string): Promise<EvaluationCyclePeriod | undefined> {
  const [row] = await dbx
    .select(cycleColumns)
    .from(evaluationCycles)
    .where(and(lte(evaluationCycles.startsOn, today), gte(evaluationCycles.endsOn, today)))
    .limit(1);
  return row;
}

/**
 * Ciclo vigente em `today` (padrão: hoje em Fortaleza). Se nenhum cobre a data, cria o ciclo do mês
 * automaticamente (idempotente), sem sobrepor ciclos existentes. Nenhum status é gravado.
 */
export async function getCurrentCycle(today: string = todayIso()): Promise<EvaluationCyclePeriod> {
  const existing = await findCovering(db, today);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    await tx.execute(CYCLES_LOCK);
    const raced = await findCovering(tx, today);
    if (raced) return raced;

    const all = await tx.select(cycleColumns).from(evaluationCycles);
    const period = autoCycleFor(today, all);
    // O id "AAAA-MM" pode já existir se a diretoria encurtou o ciclo do mês: usa um sufixo.
    const taken = new Set(all.map((c) => c.id));
    let id = period.id;
    for (let n = 2; taken.has(id); n++) id = `${period.id}-${n}`;

    const [created] = await tx
      .insert(evaluationCycles)
      .values({ ...period, id })
      .returning(cycleColumns);
    if (!created) throw new Error("Falha ao criar o ciclo de avaliação.");
    return created;
  });
}

/** Último ciclo encerrado antes de `today`, ou null. */
export async function getPreviousCycle(today: string = todayIso()): Promise<EvaluationCyclePeriod | null> {
  const [row] = await db
    .select(cycleColumns)
    .from(evaluationCycles)
    .where(lt(evaluationCycles.endsOn, today))
    .orderBy(desc(evaluationCycles.endsOn))
    .limit(1);
  return row ?? null;
}

export type CycleListItem = EvaluationCyclePeriod & { state: "encerrado" | "vigente" | "futuro"; editable: boolean };

/** Todos os ciclos (diretoria). Garante que o vigente exista. Null = sem acesso. */
export async function listEvaluationCycles(
  viewer: Member,
  today: string = todayIso(),
): Promise<CycleListItem[] | null> {
  if (!canViewEvaluationCycles(viewer)) return null;
  await getCurrentCycle(today);
  const rows = await db.select(cycleColumns).from(evaluationCycles).orderBy(asc(evaluationCycles.startsOn));
  return rows.map((c) => ({
    ...c,
    state: c.endsOn < today ? "encerrado" : c.startsOn > today ? "futuro" : "vigente",
    editable: canEditEvaluationCycle(viewer, c, today),
  }));
}

/** Diretoria ajusta as datas de um ciclo que ainda não começou, sem sobrepor os demais. */
export async function updateEvaluationCycle(
  viewer: Member,
  cycleId: string,
  input: { startsOn: string; endsOn: string },
  today: string = todayIso(),
): Promise<ActionResult> {
  if (input.startsOn > input.endsOn) {
    return { ok: false, error: "O início precisa ser antes do fim.", fieldErrors: { endsOn: "Fim antes do início." } };
  }
  if (input.startsOn <= today) {
    return {
      ok: false,
      error: "O novo início precisa ser depois de hoje.",
      fieldErrors: { startsOn: "Escolha uma data futura." },
    };
  }

  return db.transaction(async (tx) => {
    await tx.execute(CYCLES_LOCK);
    const [cycle] = await tx.select(cycleColumns).from(evaluationCycles).where(eq(evaluationCycles.id, cycleId));
    if (!cycle) return notFound("Ciclo");
    if (!canEditEvaluationCycle(viewer, cycle, today)) {
      return viewer.role === "diretoria"
        ? { ok: false, error: "Só é possível alterar ciclos que ainda não começaram." }
        : denied();
    }

    const others = await tx.select(cycleColumns).from(evaluationCycles).where(ne(evaluationCycles.id, cycleId));
    const clash = others.find((o) => periodsOverlap(o, input));
    if (clash) return { ok: false, error: `O período se sobrepõe ao ciclo ${clash.label}.` };

    await tx.update(evaluationCycles).set(input).where(eq(evaluationCycles.id, cycleId));
    return { ok: true, id: cycleId };
  });
}
