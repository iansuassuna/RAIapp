import { beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { evaluationCycles, evaluations, scoreEntries, user } from "@/db/schema";
import { resetTestDatabase, seedDatabase } from "@/db/seed";
import {
  adjustScore,
  createActivity,
  createEixoGoal,
  deleteActivity,
  deleteEixoGoal,
  getCurrentCycle,
  getDashboard,
  getEixoGoals,
  getEixoOverview,
  getEvaluationCycle,
  getMember,
  getMemberActivities,
  getPreviousCycle,
  getScoreHistory,
  listEvaluationCycles,
  submitEvaluation,
  updateActivity,
  updateEixoGoal,
  updateEvaluationCycle,
} from "@/lib/api";
import type { Member } from "@/types";

async function byId(id: string): Promise<Member> {
  const m = await getMember(id);
  if (!m) throw new Error(`Membro ${id} não encontrado.`);
  return m;
}

async function scoreOf(id: string) {
  const [row] = await db.select({ score: user.score }).from(user).where(eq(user.id, id));
  return row?.score ?? 0;
}

/** Invariante central do ledger: user.score = SUM(delta) para TODOS os usuários. */
async function expectLedgerConsistent() {
  const rows = await db.execute<{ id: string; score: number; total: number }>(sql`
    select u.id, u.score, coalesce(sum(s.delta), 0)::int as total
    from "user" u left join score_entries s on s.member_id = u.id
    group by u.id, u.score
    having u.score <> coalesce(sum(s.delta), 0)
  `);
  expect([...rows]).toEqual([]);
}

const ratings = { comprometimento: 5, comunicacao: 4, equipe: 5, tecnica: 4, proatividade: 4 };
const baseActivity = { title: "Capacitação de Arduino", type: "capacitacao" as const, date: "2026-11-20" };

beforeEach(async () => {
  await resetTestDatabase();
});

describe("ledger de pontuação", () => {
  test("seed já nasce consistente (score = soma dos lançamentos)", async () => {
    await expectLedgerConsistent();
    expect(await scoreOf("m2")).toBe(78);
  });

  test("rodar o seed de novo num banco em uso não duplica lançamentos nem quebra o ledger", async () => {
    await adjustScore(await byId("d1"), "m2", { delta: 3, reason: "Uso real antes do novo seed" });
    const before = await db.select().from(scoreEntries);
    await seedDatabase();
    await seedDatabase();
    expect(await db.select().from(scoreEntries)).toHaveLength(before.length);
    expect(await scoreOf("m2")).toBe(81);
    await expectLedgerConsistent();
  });

  test("atividade concluída credita; pendente não; concluir depois credita a diferença", async () => {
    const ana = await byId("m1");
    const done = await createActivity(ana, "m2", { ...baseActivity, status: "concluida", points: 10 });
    expect(done.ok).toBe(true);
    expect(await scoreOf("m2")).toBe(88);

    const pending = await createActivity(ana, "m2", { ...baseActivity, status: "pendente", points: 7 });
    expect(await scoreOf("m2")).toBe(88);
    if (!pending.ok || !pending.id) throw new Error("fixture");

    await updateActivity(ana, pending.id, { ...baseActivity, status: "concluida", points: 7 });
    expect(await scoreOf("m2")).toBe(95);
    await expectLedgerConsistent();
  });

  test("mudar pontos lança só a diferença; reabrir estorna; salvar sem mudar não gera lançamento", async () => {
    const ana = await byId("m1");
    const created = await createActivity(ana, "m2", { ...baseActivity, status: "concluida", points: 10 });
    if (!created.ok || !created.id) throw new Error("fixture");
    const id = created.id;

    await updateActivity(ana, id, { ...baseActivity, status: "concluida", points: 15 });
    expect(await scoreOf("m2")).toBe(78 + 15);

    const before = await db.select().from(scoreEntries).where(eq(scoreEntries.activityId, id));
    await updateActivity(ana, id, { ...baseActivity, status: "concluida", points: 15 });
    const after = await db.select().from(scoreEntries).where(eq(scoreEntries.activityId, id));
    expect(after).toHaveLength(before.length);

    await updateActivity(ana, id, { ...baseActivity, status: "em-andamento", points: 15 });
    expect(await scoreOf("m2")).toBe(78);
    await expectLedgerConsistent();
  });

  test("excluir atividade concluída estorna os pontos e mantém o histórico", async () => {
    const ana = await byId("m1");
    const created = await createActivity(ana, "m2", { ...baseActivity, status: "concluida", points: 12 });
    if (!created.ok || !created.id) throw new Error("fixture");

    expect((await deleteActivity(ana, created.id)).ok).toBe(true);
    expect(await scoreOf("m2")).toBe(78);

    const history = await getScoreHistory(ana, "m2");
    const reasons = history?.entries.map((e) => e.reason) ?? [];
    expect(reasons.some((r) => r.startsWith("Atividade concluída: Capacitação de Arduino"))).toBe(true);
    expect(reasons.some((r) => r.startsWith("Estorno de atividade removida: Capacitação de Arduino"))).toBe(true);
    expect((await getMemberActivities(ana, "m2"))?.some((a) => a.id === created.id)).toBe(false);
    await expectLedgerConsistent();
  });

  test("seed: atividade em andamento do Bruno ao concluir credita os 5 pontos dela", async () => {
    const ana = await byId("m1");
    await updateActivity(ana, "a4", {
      title: "Visita técnica — Laboratório",
      type: "visita",
      date: "2026-11-12",
      status: "concluida",
      points: 5,
    });
    expect(await scoreOf("m2")).toBe(83);
    await expectLedgerConsistent();
  });

  test("ajuste manual exige motivo, não deixa a pontuação negativa e registra o autor", async () => {
    const diretoria = await byId("d1");
    expect((await adjustScore(diretoria, "m2", { delta: 5, reason: "   " })).ok).toBe(false);
    expect((await adjustScore(diretoria, "m2", { delta: -79, reason: "Teste de limite" })).ok).toBe(false);
    expect(await scoreOf("m2")).toBe(78);

    expect((await adjustScore(diretoria, "m2", { delta: -8, reason: "Faltou à reunião geral" })).ok).toBe(true);
    expect(await scoreOf("m2")).toBe(70);
    const history = await getScoreHistory(diretoria, "m2");
    expect(history?.entries[0]).toMatchObject({
      delta: -8,
      source: "ajuste",
      reason: "Faltou à reunião geral",
      createdByName: "Lucas Pereira",
    });
    await expectLedgerConsistent();
  });
});

describe("permissões de pontuação (servidor)", () => {
  test("membro não lança pontos para si nem para colegas", async () => {
    const bruno = await byId("m2");
    expect(await createActivity(bruno, "m2", { ...baseActivity, status: "concluida", points: 50 })).toMatchObject({
      ok: false,
    });
    expect((await adjustScore(bruno, "m4", { delta: 10, reason: "Tentativa indevida" })).ok).toBe(false);
    expect(await scoreOf("m2")).toBe(78);
  });

  test("coordenação de outro eixo não gerencia; coordenação não gerencia outro coordenador nem a si", async () => {
    const eduardo = await byId("m5");
    const ana = await byId("m1");
    expect((await createActivity(eduardo, "m2", { ...baseActivity, status: "concluida", points: 5 })).ok).toBe(false);
    expect((await adjustScore(ana, "m5", { delta: 5, reason: "Coordenador vizinho" })).ok).toBe(false);
    expect((await adjustScore(ana, "m1", { delta: 5, reason: "Para mim mesma" })).ok).toBe(false);
    expect((await deleteActivity(eduardo, "a1")).ok).toBe(false);
    expect(await scoreOf("m2")).toBe(78);
  });

  test("diretoria gerencia coordenadores", async () => {
    const diretoria = await byId("d1");
    expect((await createActivity(diretoria, "m1", { ...baseActivity, status: "concluida", points: 4 })).ok).toBe(true);
    expect(await scoreOf("m1")).toBe(95);
  });

  test("histórico: o próprio membro vê o dele; colega e coordenação de outro eixo não", async () => {
    expect((await getScoreHistory(await byId("m2"), "m2"))?.canManage).toBe(false);
    expect(await getScoreHistory(await byId("m4"), "m2")).toBeNull();
    expect(await getScoreHistory(await byId("m5"), "m2")).toBeNull();
    expect(await getMemberActivities(await byId("m4"), "m2")).toBeNull();
  });
});

describe("dashboard e métricas derivadas", () => {
  test("dashboard mostra só as atividades do próprio membro; trajetória conta as concluídas", async () => {
    const bruno = await getDashboard(await byId("m2"));
    expect(bruno.trajectory).toEqual({ capacitacoes: 2, cursos: 0, visitas: 0, atividades: 4 });

    const diego = await getDashboard(await byId("m4"));
    expect(diego.activities).toHaveLength(0);
    expect(diego.trajectory).toEqual({ capacitacoes: 0, cursos: 0, visitas: 0, atividades: 0 });
  });

  test("visão do eixo: média dos membros (sem coordenação), sem quebra por time, e reage a novos pontos", async () => {
    const ana = await byId("m1");
    const before = await getEixoOverview(ana, "inovacao");
    // Inovação: Bruno 78 (mídias), Carla 54 (processos), Diego 47 (mídias).
    expect(before?.performance.score).toBe(60);
    expect(before).not.toHaveProperty("teams");
    expect(before?.activitiesCount).toBe(5);

    await adjustScore(ana, "m3", { delta: 30, reason: "Liderou o hackathon" });
    const after = await getEixoOverview(ana, "inovacao");
    expect(after?.performance.score).toBe(70);
  });
});

describe("metas do eixo", () => {
  const goal = { title: "Capacitação de Git", deadline: "2026-12-15", status: "pendente" as const };

  test("coordenação do eixo faz CRUD; outro eixo e diretoria não", async () => {
    const ana = await byId("m1");
    const created = await createEixoGoal(ana, "inovacao", goal);
    if (!created.ok || !created.id) throw new Error("fixture");

    expect((await createEixoGoal(await byId("m5"), "inovacao", goal)).ok).toBe(false);
    expect((await createEixoGoal(await byId("d1"), "inovacao", goal)).ok).toBe(false);
    expect((await updateEixoGoal(await byId("m5"), created.id, { ...goal, status: "concluida" })).ok).toBe(false);

    expect((await updateEixoGoal(ana, created.id, { ...goal, status: "concluida" })).ok).toBe(true);
    const goals = await getEixoGoals(ana, "inovacao");
    expect(goals?.find((g) => g.id === created.id)?.status).toBe("concluida");

    expect((await deleteEixoGoal(await byId("d1"), created.id)).ok).toBe(false);
    expect((await deleteEixoGoal(ana, created.id)).ok).toBe(true);
    expect((await getEixoGoals(ana, "inovacao"))?.some((g) => g.id === created.id)).toBe(false);
  });
});

describe("ciclos de avaliação por data", () => {
  test("vigente e anterior pela data; mês novo é criado automaticamente e só uma vez", async () => {
    expect((await getCurrentCycle("2026-11-23")).id).toBe("2026-11");
    expect((await getPreviousCycle("2026-11-23"))?.id).toBe("2026-10");

    const [a, b, c] = await Promise.all([
      getCurrentCycle("2026-12-05"),
      getCurrentCycle("2026-12-05"),
      getCurrentCycle("2026-12-20"),
    ]);
    expect([a.id, b.id, c.id]).toEqual(["2026-12", "2026-12", "2026-12"]);
    expect(a).toMatchObject({ label: "Dezembro/26", startsOn: "2026-12-01", endsOn: "2026-12-31" });
    const december = await db.select().from(evaluationCycles).where(eq(evaluationCycles.id, "2026-12"));
    expect(december).toHaveLength(1);
    expect((await getPreviousCycle("2026-12-05"))?.id).toBe("2026-11");
  });

  test("tela de avaliação informa o ciclo e os dias restantes", async () => {
    const cycle = await getEvaluationCycle(await byId("m2"), "2026-11-23");
    expect(cycle).toMatchObject({ id: "2026-11", label: "Novembro/26", endsOn: "2026-11-30", daysLeft: 7 });
    expect(cycle.submitted.m3).toBeUndefined();
    // Recebidas = ciclo anterior (outubro).
    expect(Object.keys(cycle.received).length).toBeGreaterThan(0);
  });

  test("envio de um ciclo já encerrado é recusado; sem ciclo informado vai para o vigente", async () => {
    const bruno = await byId("m2");
    const stale = await submitEvaluation(bruno, "m4", { ratings, comment: "", cycleId: "2026-11" }, "2026-12-01");
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error).toContain("Dezembro/26");

    expect((await submitEvaluation(bruno, "m4", { ratings, comment: "" }, "2026-12-01")).ok).toBe(true);
    const rows = await db.select().from(evaluations).where(eq(evaluations.evaluatorId, "m2"));
    expect(rows.find((r) => r.evaluateeId === "m4")?.cycle).toBe("2026-12");
  });

  test("diretoria ajusta só ciclos futuros e sem sobreposição; o automático respeita o ajuste", async () => {
    const diretoria = await byId("d1");
    const today = "2026-12-10";
    await getCurrentCycle(today);
    const january = await getCurrentCycle("2027-01-15");
    expect(january.id).toBe("2027-01");

    expect((await updateEvaluationCycle(await byId("m1"), "2027-01", january, today)).ok).toBe(false);
    expect(
      (await updateEvaluationCycle(diretoria, "2026-12", { startsOn: "2026-12-11", endsOn: "2026-12-31" }, today)).ok,
    ).toBe(false);
    expect(
      (await updateEvaluationCycle(diretoria, "2027-01", { startsOn: "2026-12-20", endsOn: "2027-01-31" }, today)).ok,
    ).toBe(false);

    expect(
      (await updateEvaluationCycle(diretoria, "2027-01", { startsOn: "2027-01-10", endsOn: "2027-02-05" }, today)).ok,
    ).toBe(true);

    // 05/01/2027 ficou descoberto: o ciclo automático ocupa só o buraco e ganha id com sufixo.
    const gap = await getCurrentCycle("2027-01-05");
    expect(gap).toMatchObject({ id: "2027-01-2", startsOn: "2027-01-01", endsOn: "2027-01-09" });

    const list = await listEvaluationCycles(diretoria, today);
    expect(list?.find((c) => c.id === "2026-12")).toMatchObject({ state: "vigente", editable: false });
    expect(list?.find((c) => c.id === "2027-01")).toMatchObject({ state: "futuro", editable: true });
    expect(await listEvaluationCycles(await byId("m1"), today)).toBeNull();
  });
});
