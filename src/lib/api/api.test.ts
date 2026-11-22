import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resourceRequests, user } from "@/db/schema";
import { resetTestDatabase } from "@/db/seed";
import { SEED_PASSWORD } from "@/db/seed-data";
import { auth } from "@/lib/auth";
import {
  addTask,
  advanceRequest,
  allocateComponent,
  completePurchase,
  createInventoryItem,
  createProject,
  createRequest,
  deleteInventoryItem,
  deleteProject,
  getAllMembers,
  getDirectorRequests,
  getEixoMembers,
  getEixoOverview,
  getEixoRequests,
  getEvaluationCycle,
  getInventory,
  getInventoryItem,
  getMember,
  getMemberEvaluations,
  getPanelProposals,
  getProject,
  getProjectPurchases,
  getRequestDeadlines,
  resolveProposal,
  resolveRequest,
  submitEvaluation,
  updateInventoryItem,
  updateMemberRole,
  updateTaskStatus,
} from "./index";

async function byId(id: string) {
  const m = await getMember(id);
  if (!m) throw new Error(`Membro ${id} não encontrado no banco de teste.`);
  return m;
}

const newProject = {
  name: "Robô seguidor",
  status: "planejamento" as const,
  startDate: "2026-12-01",
  deadline: "2027-01-30",
  memberIds: ["m2"],
};

beforeEach(async () => {
  await resetTestDatabase();
});

describe("eixos", () => {
  test("membro e coordenador só veem o próprio eixo; diretoria vê todos", async () => {
    const membro = await byId("m2");
    const coordSaude = await byId("m8");
    const dir = await byId("d1");
    expect(await getEixoOverview(membro, "inovacao")).not.toBeNull();
    expect(await getEixoOverview(membro, "tecnico-sustentavel")).toBeNull();
    expect(await getEixoOverview(coordSaude, "inovacao")).toBeNull();
    for (const eixo of ["inovacao", "tecnico-sustentavel", "tecnologias-saude"] as const) {
      expect((await getEixoOverview(dir, eixo))?.eixo).toBe(eixo);
    }
  });

  test("aba Membros lista todos os membros associados ao eixo", async () => {
    const members = (await getEixoMembers(await byId("m1"), "inovacao"))!;
    expect(members.every((m) => m.eixo === "inovacao")).toBe(true);
    expect(members.map((m) => m.id).sort()).toEqual(["m1", "m2", "m3", "m4"]);
  });
});

describe("projetos", () => {
  test("só a coordenação do eixo cria projetos", async () => {
    expect((await createProject(await byId("m2"), "inovacao", newProject)).ok).toBe(false);
    expect((await createProject(await byId("d1"), "inovacao", newProject)).ok).toBe(false);
    expect((await createProject(await byId("m8"), "inovacao", newProject)).ok).toBe(false);
    expect((await createProject(await byId("m1"), "inovacao", newProject)).ok).toBe(true);
  });

  test("não afilia membro de outro eixo", async () => {
    const res = await createProject(await byId("m1"), "inovacao", { ...newProject, memberIds: ["m6"] });
    expect(res.ok).toBe(false);
  });

  test("coordenação de outro eixo não exclui projeto", async () => {
    const coord = await byId("m1");
    expect((await deleteProject(await byId("m8"), "p1")).ok).toBe(false);
    expect((await deleteProject(coord, "p1")).ok).toBe(true);
    expect((await getProject(coord, "inovacao", "p1")).project).toBeNull();
  });

  test("tarefa só pode ser atribuída a membro do projeto", async () => {
    const coord = await byId("m1");
    expect((await addTask(coord, "p1", { title: "X", assigneeId: "m4", deadline: "2026-12-01" })).ok).toBe(false);
    expect((await addTask(coord, "p1", { title: "X", assigneeId: "m2", deadline: "2026-12-01" })).ok).toBe(true);
  });

  test("responsável muda o status da própria tarefa; outros membros não", async () => {
    const membro = await byId("m2");
    const coord = await byId("m1");
    expect((await updateTaskStatus(membro, "p1", "t2", "concluida")).ok).toBe(true);
    expect((await updateTaskStatus(membro, "p1", "t3", "concluida")).ok).toBe(false);
    expect((await updateTaskStatus(coord, "p1", "t3", "concluida")).ok).toBe(true);
  });

  test("não aloca mais componentes do que o disponível", async () => {
    const coord = await byId("m1");
    const before = (await getInventory()).find((i) => i.id === "c3")!;
    expect(before.available).toBe(2);
    expect((await allocateComponent(coord, "p1", "c3", 3)).ok).toBe(false);
    expect((await allocateComponent(coord, "p1", "c3", 2)).ok).toBe(true);
    expect((await getInventory()).find((i) => i.id === "c3")!.available).toBe(0);
  });
});

describe("requisições de coordenadores → diretoria", () => {
  const pedido = {
    kind: "pedido" as const,
    title: "Kit de capacitação",
    explanation: "10 kits Arduino",
    justification: "Capacitação do eixo.",
  };

  test("coordenador pede à diretoria só com título, explicação e justificativa", async () => {
    const coord = await byId("m1");
    const res = await createRequest(coord, pedido);
    expect(res.ok).toBe(true);
    const created = (await getDirectorRequests(await byId("d1")))!.find((r) => r.id === (res as { id: string }).id);
    expect(created?.reviewer).toBe("diretoria");
    expect(
      (await createRequest(coord, { kind: "componente", componentId: "c1", quantity: 1, justification: "x" })).ok,
    ).toBe(false);
    expect((await createRequest(await byId("m2"), pedido)).ok).toBe(false);
  });

  test("diretoria não faz requisições", async () => {
    expect((await createRequest(await byId("d1"), pedido)).ok).toBe(false);
  });

  test("só a diretoria resolve os pedidos dos coordenadores e marca como feito", async () => {
    const dir = await byId("d1");
    const coord = await byId("m1");
    const queue = (await getDirectorRequests(dir))!;
    expect(queue.every((r) => r.reviewer === "diretoria")).toBe(true);
    expect(await getDirectorRequests(coord)).toBeNull();
    expect((await resolveRequest(coord, "r7", "aprovada", "")).ok).toBe(false);
    expect((await resolveRequest(dir, "r7", "aprovada", "")).ok).toBe(true);
    const [r7] = await db.select().from(resourceRequests).where(eq(resourceRequests.id, "r7"));
    expect(r7?.progress).toBe("aguardando");
    expect((await advanceRequest(dir, "r7", "feito")).ok).toBe(true);
  });

  test("fila do eixo não mostra pedidos da coordenação", async () => {
    const queue = (await getEixoRequests(await byId("m1"), "inovacao"))!;
    expect(queue.some((r) => r.id === "r7")).toBe(false);
  });
});

describe("requisições de membros", () => {
  const just = { justification: "Preciso para o projeto." };

  test("membro só vincula projetos aos quais é afiliado", async () => {
    const base = { kind: "componente" as const, componentId: "c1", quantity: 1, ...just };
    expect((await createRequest(await byId("m2"), { ...base, projectId: "p1" })).ok).toBe(true);
    expect((await createRequest(await byId("m4"), { ...base, projectId: "p1" })).ok).toBe(false);
  });

  test("coordenação do eixo e diretoria veem e resolvem a fila do eixo", async () => {
    expect(await getEixoRequests(await byId("m2"), "inovacao")).toBeNull();
    expect(await getEixoRequests(await byId("m8"), "inovacao")).toBeNull();
    expect(await getEixoRequests(await byId("d1"), "inovacao")).not.toBeNull();
    expect((await resolveRequest(await byId("m8"), "r1", "aprovada", "")).ok).toBe(false);
    expect((await resolveRequest(await byId("d1"), "r1", "aprovada", "")).ok).toBe(true);
  });

  test("aprovar componente com projeto aloca no projeto, fica em uso e baixa o estoque", async () => {
    const coord = await byId("m1");
    const before = (await getInventory()).find((i) => i.id === "c4")!.available;
    expect((await resolveRequest(coord, "r1", "aprovada", "Ok")).ok).toBe(true);
    const [r1] = await db.select().from(resourceRequests).where(eq(resourceRequests.id, "r1"));
    expect(r1?.progress).toBe("em-uso");
    const { project } = await getProject(coord, "inovacao", "p1");
    expect(project?.components.find((c) => c.componentId === "c4")?.quantity).toBe(4);
    expect((await getInventory()).find((i) => i.id === "c4")!.available).toBe(before - 4);
    expect((await resolveRequest(coord, "r1", "recusada", "x")).ok).toBe(false);
  });

  test("devolver componente libera o estoque (projeto e empréstimo)", async () => {
    const coord = await byId("m1");
    await resolveRequest(coord, "r1", "aprovada", "");
    const before = (await getInventory()).find((i) => i.id === "c4")!.available;
    expect((await advanceRequest(coord, "r1", "devolvido")).ok).toBe(true);
    expect((await getInventory()).find((i) => i.id === "c4")!.available).toBe(before + 4);
    const loanBefore = (await getInventory()).find((i) => i.id === "c1")!.available;
    expect((await advanceRequest(coord, "r3", "devolvido")).ok).toBe(true);
    expect((await getInventory()).find((i) => i.id === "c1")!.available).toBe(loanBefore + 1);
  });

  test("não aprova componente sem estoque", async () => {
    const coordSust = await byId("m5");
    expect((await resolveRequest(coordSust, "r4", "aprovada", "")).ok).toBe(true);
    const extra = await createRequest(await byId("m6"), {
      kind: "componente",
      componentId: "c7",
      quantity: 1,
      ...just,
    });
    expect(extra.ok).toBe(true);
    expect((await resolveRequest(coordSust, (extra as { id: string }).id, "aprovada", "")).ok).toBe(false);
  });

  test("cada tipo ganha o andamento inicial do seu ciclo", async () => {
    const m = await byId("m2");
    const coord = await byId("m1");
    const rVerba = await createRequest(m, {
      kind: "verba",
      amount: 50,
      usage: "Impressões",
      deadline: "2026-12-20",
      ...just,
    });
    const rAuth = await createRequest(m, {
      kind: "autorizacao",
      startDate: "2026-12-01",
      endDate: "2027-01-01",
      ...just,
    });
    const rOutros = await createRequest(m, { kind: "outros", explanation: "Camisetas do eixo", date: null, ...just });
    const ids = ["r2", (rVerba as { id: string }).id, (rAuth as { id: string }).id, (rOutros as { id: string }).id];
    for (const id of ids) await resolveRequest(coord, id, "aprovada", "");
    const rows = await db.select().from(resourceRequests);
    const progress = Object.fromEntries(rows.filter((r) => ids.includes(r.id)).map((r) => [r.kind, r.progress]));
    expect(progress).toMatchObject({
      reuniao: "agendada",
      verba: "aguardando-liberacao",
      autorizacao: "ativa",
      outros: "aguardando",
    });
  });

  test("verba segue o ciclo e não pula etapas", async () => {
    const coord = await byId("m1");
    expect((await advanceRequest(coord, "r10", "prestacao-entregue")).ok).toBe(false);
    expect((await advanceRequest(coord, "r10", "liberada")).ok).toBe(true);
    expect((await advanceRequest(coord, "r10", "prestacao-entregue")).ok).toBe(true);
  });

  test("reunião não aceita sala ocupada no mesmo horário", async () => {
    await resolveRequest(await byId("m1"), "r2", "aprovada", "");
    const res = await createRequest(await byId("m3"), {
      kind: "reuniao",
      date: "2026-11-27",
      time: "14:00",
      room: "sala-2",
      ...just,
    });
    expect(res.ok).toBe(false);
  });

  test("compra feita cria item no inventário em uso no projeto", async () => {
    const coord = await byId("m1");
    const info = {
      name: "Display OLED",
      category: "Atuador",
      cabinet: "A2",
      ownerEixo: "inovacao" as const,
      quantity: 2,
      paidValue: 64,
    };
    expect((await completePurchase(await byId("m8"), "r9", info)).ok).toBe(false);
    expect((await completePurchase(coord, "r9", { ...info, ownerEixo: "tecnologias-saude" })).ok).toBe(false);
    const res = await completePurchase(coord, "r9", info);
    expect(res.ok).toBe(true);
    const item = (await getInventoryItem((res as { id: string }).id))!;
    expect(item).toMatchObject({ total: 2, inUse: 2, available: 0, cabinet: "A2", ownerEixo: "inovacao" });
    const { project } = await getProject(coord, "inovacao", "p1");
    expect(project?.components.some((c) => c.componentId === item.id)).toBe(true);
    const [r9] = await db.select().from(resourceRequests).where(eq(resourceRequests.id, "r9"));
    expect(r9?.progress).toBe("feito");
  });

  test("compra aguardando aparece nos prazos de quem pediu, da coordenação e do projeto", async () => {
    expect((await getRequestDeadlines(await byId("m3"))).some((d) => d.request.id === "r9")).toBe(true);
    expect((await getRequestDeadlines(await byId("m1"))).some((d) => d.request.id === "r9")).toBe(true);
    expect((await getRequestDeadlines(await byId("m2"))).some((d) => d.request.id === "r9")).toBe(false);
    expect((await getProjectPurchases("p1")).some((r) => r.id === "r9")).toBe(true);
  });
});

describe("inventário", () => {
  const item = { name: "Sensor PIR", category: "Sensor", cabinet: "A3", ownerEixo: null, total: 5 };

  test("membro comum não altera; time Processos propõe; coordenação e diretoria aplicam", async () => {
    expect((await createInventoryItem(await byId("m2"), item)).ok).toBe(false);
    expect(await createInventoryItem(await byId("m3"), item)).toMatchObject({ ok: true, pending: true });
    expect((await getInventory()).some((i) => i.name === "Sensor PIR")).toBe(false);
    expect(await createInventoryItem(await byId("m1"), item)).toMatchObject({ ok: true });
    expect((await createInventoryItem(await byId("d1"), { ...item, ownerEixo: "tecnologias-saude" })).ok).toBe(true);
  });

  test("coordenação edita só itens do próprio eixo e sem propriedade", async () => {
    const c7 = (await getInventoryItem("c7"))!;
    expect((await updateInventoryItem(await byId("m1"), "c7", { ...c7, cabinet: "A1" })).ok).toBe(false);
    expect((await updateInventoryItem(await byId("m5"), "c7", { ...c7, cabinet: "A1" })).ok).toBe(true);
    const c2 = (await getInventoryItem("c2"))!;
    expect((await updateInventoryItem(await byId("m8"), "c2", { ...c2, cabinet: "C2" })).ok).toBe(true);
  });

  test("não reduz o total abaixo do que está em uso nem exclui item em uso", async () => {
    const coord = await byId("m1");
    const c3 = (await getInventoryItem("c3"))!;
    expect((await updateInventoryItem(coord, "c3", { ...c3, total: 0 })).ok).toBe(false);
    expect((await deleteInventoryItem(coord, "c3")).ok).toBe(false);
  });

  test("proposta sem dono: qualquer coordenação aprova; com dono: só a do eixo dono", async () => {
    const coordSaude = await byId("m8");
    const coordInov = await byId("m1");
    expect((await resolveProposal(coordSaude, "ip1", "aplicada", "")).ok).toBe(true);
    expect((await getInventoryItem("c2"))!.cabinet).toBe("C1");
    expect((await resolveProposal(coordSaude, "ip2", "aplicada", "")).ok).toBe(false);
    expect((await resolveProposal(coordInov, "ip2", "aplicada", "")).ok).toBe(true);
    expect((await getInventory()).some((i) => i.name === "Sensor de gás MQ-135")).toBe(true);
  });

  test("painel mostra propostas do eixo e as sem propriedade", async () => {
    expect((await getPanelProposals(await byId("m8"), "tecnologias-saude")).map((p) => p.id)).toEqual(["ip1"]);
    expect((await getPanelProposals(await byId("m1"), "inovacao")).map((p) => p.id).sort()).toEqual(["ip1", "ip2"]);
  });
});

describe("vínculos e gestão de papéis pela diretoria", () => {
  test("diretoria sem eixo nem time; coordenadores sem time", async () => {
    const d = await byId("d1");
    expect(d.eixo).toBeNull();
    expect(d.time).toBeNull();
    const all = (await getAllMembers(d))!;
    for (const m of all.filter((x) => x.role === "coordenador")) expect(m.time).toBeNull();
  });

  test("só a diretoria lista e altera papéis; protege último diretor e 1 coordenador por eixo", async () => {
    const dir = await byId("d1");
    const coord = await byId("m1");
    const membro = await byId("m2");

    expect(await getAllMembers(coord)).toBeNull();
    expect((await updateMemberRole(coord, "m2", { role: "diretoria", eixo: null, time: null })).ok).toBe(false);

    // Não permite remover o último diretor
    expect((await updateMemberRole(dir, "d1", { role: "membro", eixo: "inovacao", time: "midias" })).ok).toBe(false);

    // Não permite 2 coordenadores no mesmo eixo
    expect((await updateMemberRole(dir, "m2", { role: "coordenador", eixo: "inovacao", time: null })).ok).toBe(false);

    // Rebaixa coordenador atual e promove outro membro para coordenador do eixo
    expect((await updateMemberRole(dir, "m1", { role: "membro", eixo: "inovacao", time: "processos" })).ok).toBe(true);
    expect((await updateMemberRole(dir, "m2", { role: "coordenador", eixo: "inovacao", time: null })).ok).toBe(true);
    const promoted = await byId("m2");
    expect(promoted).toMatchObject({ role: "coordenador", eixo: "inovacao", time: null });

    // Promover membro para diretoria remove vínculos de projetos e tarefas do eixo anterior
    expect((await updateMemberRole(dir, "m3", { role: "diretoria", eixo: null, time: null })).ok).toBe(true);
    const { project } = await getProject(await byId("m2"), "inovacao", "p1");
    expect(project?.memberIds.includes("m3")).toBe(false);
    expect(project?.tasks.find((t) => t.id === "t3")?.assigneeId).toBeNull();

    // Agora existem 2 diretores, então d1 pode mudar de papel
    expect((await updateMemberRole(dir, "d1", { role: "membro", eixo: "inovacao", time: "midias" })).ok).toBe(true);
    expect(membro.id).toBe("m2");
  });
});

describe("avaliação cruzada", () => {
  test("inclui colegas de todos os eixos, menos o próprio membro", async () => {
    const { colleagues } = await getEvaluationCycle(await byId("m2"));
    expect(colleagues.some((c) => c.id === "m2")).toBe(false);
    const eixos = new Set(colleagues.map((c) => c.eixo));
    for (const eixo of ["inovacao", "tecnico-sustentavel", "tecnologias-saude"] as const)
      expect(eixos.has(eixo)).toBe(true);
  });

  test("avaliação enviada fica salva e aparece para a coordenação do eixo do avaliado", async () => {
    const ratings = { comprometimento: 5, comunicacao: 5, equipe: 5, tecnica: 5, proatividade: 5 };
    expect((await submitEvaluation(await byId("m9"), "m3", { ratings, comment: "Ótima!" })).ok).toBe(true);
    expect((await getEvaluationCycle(await byId("m9"))).submitted.m3?.comment).toBe("Ótima!");

    const report = (await getMemberEvaluations(await byId("m1"), "m3"))!;
    expect(report.cycles[0]!.evaluations.some((e) => e.evaluatorId === "m9")).toBe(true);
    expect(await getMemberEvaluations(await byId("m2"), "m3")).toBeNull();
    expect(await getMemberEvaluations(await byId("m8"), "m3")).toBeNull();
  });

  test("não permite autoavaliação", async () => {
    const ratings = { comprometimento: 5, comunicacao: 5, equipe: 5, tecnica: 5, proatividade: 5 };
    expect((await submitEvaluation(await byId("m2"), "m2", { ratings, comment: "" })).ok).toBe(false);
  });
});

describe("autenticação (Better Auth)", () => {
  test("cadastro público cria membro com eixo/time e ignora tentativa de escalação de papel", async () => {
    const res = await auth.api.signUpEmail({
      body: {
        name: "Novo Membro",
        email: "novo@raitec.ufc.br",
        password: "senhasegura123",
        eixo: "inovacao",
        time: "processos",
      },
    });
    expect(res.user.email).toBe("novo@raitec.ufc.br");

    const [created] = await db.select().from(user).where(eq(user.email, "novo@raitec.ufc.br"));
    expect(created).toMatchObject({ role: "membro", eixo: "inovacao", time: "processos" });
  });

  test("cadastro direto pela API aplica as regras do formulário (nome, eixo, time) com erro 400", async () => {
    const attempt = async (body: Record<string, unknown>) => {
      try {
        await auth.api.signUpEmail({ body: { password: "senhasegura123", ...body } as never });
        return null;
      } catch (error) {
        return error as { statusCode?: number; body?: { code?: string } };
      }
    };

    const shortName = await attempt({ name: " A ", email: "curto@raitec.ufc.br", eixo: "inovacao", time: "midias" });
    expect(shortName?.statusCode).toBe(400);
    expect(shortName?.body?.code).toBe("INVALID_SIGN_UP");

    const badEixo = await attempt({ name: "Eixo Ruim", email: "eixo@raitec.ufc.br", eixo: "marte", time: "midias" });
    expect(badEixo?.statusCode).toBe(400);

    const noTime = await attempt({ name: "Sem Time", email: "time@raitec.ufc.br", eixo: "inovacao" });
    expect(noTime?.statusCode).toBe(400);

    const rows = await db.select().from(user).where(eq(user.email, "curto@raitec.ufc.br"));
    expect(rows).toHaveLength(0);
  });

  test("cadastro grava o nome sem espaços nas pontas", async () => {
    await auth.api.signUpEmail({
      body: {
        name: "  Maria Silva  ",
        email: "maria@raitec.ufc.br",
        password: "senhasegura123",
        eixo: "inovacao",
        time: "midias",
      },
    });
    const [created] = await db.select().from(user).where(eq(user.email, "maria@raitec.ufc.br"));
    expect(created?.name).toBe("Maria Silva");
  });

  test("login com credenciais válidas do seed funciona e rejeita senha incorreta", async () => {
    const ok = await auth.api.signInEmail({
      body: { email: "ana@raitec.ufc.br", password: SEED_PASSWORD },
    });
    expect(ok.user.email).toBe("ana@raitec.ufc.br");

    let failed = false;
    try {
      await auth.api.signInEmail({
        body: { email: "ana@raitec.ufc.br", password: "senha-errada" },
      });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
