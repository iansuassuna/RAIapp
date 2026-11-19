import { beforeEach, describe, expect, test } from "bun:test";
import { getDb, resetDb } from "../db";
import {
  addTask,
  advanceRequest,
  completePurchase,
  createInventoryItem,
  deleteInventoryItem,
  getPanelProposals,
  getProjectPurchases,
  getRequestDeadlines,
  resolveProposal,
  updateInventoryItem,
  allocateComponent,
  createProject,
  createRequest,
  deleteProject,
  getEixoMembers,
  getEixoOverview,
  getDirectorRequests,
  getEixoRequests,
  getEvaluationCycle,
  getInventory,
  getMemberEvaluations,
  resolveRequest,
  submitEvaluation,
  updateTaskStatus,
} from "./index";

const byId = (id: string) => getDb().members.find((m) => m.id === id)!;
const membroInovacao = () => byId("m2");
const coordInovacao = () => byId("m1");
const coordSaude = () => byId("m8");
const diretoria = () => byId("d1");

const newProject = { name: "Robô seguidor", status: "planejamento" as const, startDate: "2026-12-01", deadline: "2027-01-30", memberIds: ["m2"] };

beforeEach(() => resetDb());

describe("eixos", () => {
  test("membro e coordenador só veem o próprio eixo; diretoria vê todos", async () => {
    expect(await getEixoOverview(membroInovacao(), "inovacao")).not.toBeNull();
    expect(await getEixoOverview(membroInovacao(), "tecnico-sustentavel")).toBeNull();
    expect(await getEixoOverview(coordSaude(), "inovacao")).toBeNull();
    for (const eixo of ["inovacao", "tecnico-sustentavel", "tecnologias-saude"] as const) {
      expect((await getEixoOverview(diretoria(), eixo))?.eixo).toBe(eixo);
    }
  });

  test("aba Membros lista todos os membros associados ao eixo", async () => {
    const members = (await getEixoMembers(coordInovacao(), "inovacao"))!;
    expect(members.every((m) => m.eixo === "inovacao")).toBe(true);
    expect(members.map((m) => m.id).sort()).toEqual(["m1", "m2", "m3", "m4"]); // diretoria não é afiliada a eixo
  });
});

describe("projetos", () => {
  test("só a coordenação do eixo cria projetos", async () => {
    expect((await createProject(membroInovacao(), "inovacao", newProject)).ok).toBe(false);
    expect((await createProject(diretoria(), "inovacao", newProject)).ok).toBe(false);
    expect((await createProject(coordSaude(), "inovacao", newProject)).ok).toBe(false);
    expect((await createProject(coordInovacao(), "inovacao", newProject)).ok).toBe(true);
  });

  test("não afilia membro de outro eixo", async () => {
    const res = await createProject(coordInovacao(), "inovacao", { ...newProject, memberIds: ["m6"] });
    expect(res.ok).toBe(false);
  });

  test("coordenação de outro eixo não exclui projeto", async () => {
    expect((await deleteProject(coordSaude(), "p1")).ok).toBe(false);
    expect((await deleteProject(coordInovacao(), "p1")).ok).toBe(true);
    expect(getDb().projects.some((p) => p.id === "p1")).toBe(false);
  });

  test("tarefa só pode ser atribuída a membro do projeto", async () => {
    expect((await addTask(coordInovacao(), "p1", { title: "X", assigneeId: "m4", deadline: "2026-12-01" })).ok).toBe(false);
    expect((await addTask(coordInovacao(), "p1", { title: "X", assigneeId: "m2", deadline: "2026-12-01" })).ok).toBe(true);
  });

  test("responsável muda o status da própria tarefa; outros membros não", async () => {
    expect((await updateTaskStatus(membroInovacao(), "p1", "t2", "concluida")).ok).toBe(true); // t2 é do m2
    expect((await updateTaskStatus(membroInovacao(), "p1", "t3", "concluida")).ok).toBe(false); // t3 é do m3
    expect((await updateTaskStatus(coordInovacao(), "p1", "t3", "concluida")).ok).toBe(true);
  });

  test("não aloca mais componentes do que o disponível", async () => {
    const before = (await getInventory()).find((i) => i.id === "c3")!; // Raspberry Pi: 3, 1 em uso
    expect(before.available).toBe(2);
    expect((await allocateComponent(coordInovacao(), "p1", "c3", 3)).ok).toBe(false);
    expect((await allocateComponent(coordInovacao(), "p1", "c3", 2)).ok).toBe(true);
    expect((await getInventory()).find((i) => i.id === "c3")!.available).toBe(0);
  });
});

describe("requisições de coordenadores → diretoria", () => {
  const pedido = { kind: "pedido" as const, title: "Kit de capacitação", explanation: "10 kits Arduino", justification: "Capacitação do eixo." };

  test("coordenador pede à diretoria só com título, explicação e justificativa", async () => {
    expect((await createRequest(coordInovacao(), pedido)).ok).toBe(true);
    const created = getDb().requests.find((r) => r.memberId === "m1" && r.kind === "pedido" && r.title === "Kit de capacitação");
    expect(created?.reviewer).toBe("diretoria");
    expect((await createRequest(coordInovacao(), { kind: "componente", componentId: "c1", quantity: 1, justification: "x" })).ok).toBe(false);
    expect((await createRequest(membroInovacao(), pedido)).ok).toBe(false);
  });

  test("diretoria não faz requisições", async () => {
    expect((await createRequest(diretoria(), pedido)).ok).toBe(false);
  });

  test("só a diretoria resolve os pedidos dos coordenadores e marca como feito", async () => {
    const queue = (await getDirectorRequests(diretoria()))!;
    expect(queue.every((r) => r.reviewer === "diretoria")).toBe(true);
    expect(await getDirectorRequests(coordInovacao())).toBeNull();
    expect((await resolveRequest(coordInovacao(), "r7", "aprovada", "")).ok).toBe(false);
    expect((await resolveRequest(diretoria(), "r7", "aprovada", "")).ok).toBe(true);
    expect(getDb().requests.find((r) => r.id === "r7")!.progress).toBe("aguardando");
    expect((await advanceRequest(diretoria(), "r7", "feito")).ok).toBe(true);
  });

  test("fila do eixo não mostra pedidos da coordenação", async () => {
    const queue = (await getEixoRequests(coordInovacao(), "inovacao"))!;
    expect(queue.some((r) => r.id === "r7")).toBe(false);
  });
});

describe("requisições de membros", () => {
  const just = { justification: "Preciso para o projeto." };

  test("membro só vincula projetos aos quais é afiliado", async () => {
    const base = { kind: "componente" as const, componentId: "c1", quantity: 1, ...just };
    expect((await createRequest(membroInovacao(), { ...base, projectId: "p1" })).ok).toBe(true); // m2 está no p1
    expect((await createRequest(byId("m4"), { ...base, projectId: "p1" })).ok).toBe(false); // m4 não está no p1
  });

  test("coordenação do eixo e diretoria veem e resolvem a fila do eixo", async () => {
    expect(await getEixoRequests(membroInovacao(), "inovacao")).toBeNull();
    expect(await getEixoRequests(coordSaude(), "inovacao")).toBeNull();
    expect(await getEixoRequests(diretoria(), "inovacao")).not.toBeNull();
    expect((await resolveRequest(coordSaude(), "r1", "aprovada", "")).ok).toBe(false);
    expect((await resolveRequest(diretoria(), "r1", "aprovada", "")).ok).toBe(true);
  });

  test("aprovar componente com projeto aloca no projeto, fica em uso e baixa o estoque", async () => {
    const before = (await getInventory()).find((i) => i.id === "c4")!.available;
    expect((await resolveRequest(coordInovacao(), "r1", "aprovada", "Ok")).ok).toBe(true);
    expect(getDb().requests.find((r) => r.id === "r1")!.progress).toBe("em-uso");
    expect(getDb().projects.find((p) => p.id === "p1")!.components.find((c) => c.componentId === "c4")?.quantity).toBe(4);
    expect((await getInventory()).find((i) => i.id === "c4")!.available).toBe(before - 4);
    expect((await resolveRequest(coordInovacao(), "r1", "recusada", "x")).ok).toBe(false); // já resolvida
  });

  test("devolver componente libera o estoque (projeto e empréstimo)", async () => {
    await resolveRequest(coordInovacao(), "r1", "aprovada", "");
    const before = (await getInventory()).find((i) => i.id === "c4")!.available;
    expect((await advanceRequest(coordInovacao(), "r1", "devolvido")).ok).toBe(true);
    expect((await getInventory()).find((i) => i.id === "c4")!.available).toBe(before + 4);
    const loanBefore = (await getInventory()).find((i) => i.id === "c1")!.available;
    expect((await advanceRequest(coordInovacao(), "r3", "devolvido")).ok).toBe(true);
    expect((await getInventory()).find((i) => i.id === "c1")!.available).toBe(loanBefore + 1);
  });

  test("não aprova componente sem estoque", async () => {
    // c7 (painel solar): 4 no total, 2 no p3; r4 pede 2 → ok; depois outro de 1 → falha
    expect((await resolveRequest(byId("m5"), "r4", "aprovada", "")).ok).toBe(true);
    await createRequest(byId("m6"), { kind: "componente", componentId: "c7", quantity: 1, ...just });
    const extra = getDb().requests.find((r) => r.memberId === "m6" && r.status === "pendente")!;
    expect((await resolveRequest(byId("m5"), extra.id, "aprovada", "")).ok).toBe(false);
  });

  test("cada tipo ganha o andamento inicial do seu ciclo", async () => {
    const m = membroInovacao();
    await createRequest(m, { kind: "verba", amount: 50, usage: "Impressões", deadline: "2026-12-20", ...just });
    await createRequest(m, { kind: "autorizacao", startDate: "2026-12-01", endDate: "2027-01-01", ...just });
    await createRequest(m, { kind: "outros", explanation: "Camisetas do eixo", date: null, ...just });
    const pending = getDb().requests.filter((r) => r.memberId === "m2" && r.status === "pendente");
    for (const r of pending) await resolveRequest(coordInovacao(), r.id, "aprovada", "");
    const progress = Object.fromEntries(getDb().requests.filter((r) => pending.some((x) => x.id === r.id)).map((r) => [r.kind, r.progress]));
    expect(progress).toMatchObject({ reuniao: "agendada", verba: "aguardando-liberacao", autorizacao: "ativa", outros: "aguardando" });
  });

  test("verba segue o ciclo e não pula etapas", async () => {
    expect((await advanceRequest(coordInovacao(), "r10", "prestacao-entregue")).ok).toBe(false);
    expect((await advanceRequest(coordInovacao(), "r10", "liberada")).ok).toBe(true);
    expect((await advanceRequest(coordInovacao(), "r10", "prestacao-entregue")).ok).toBe(true);
  });

  test("reunião não aceita sala ocupada no mesmo horário", async () => {
    await resolveRequest(coordInovacao(), "r2", "aprovada", ""); // sala-2, 27/11 14h
    const res = await createRequest(byId("m3"), { kind: "reuniao", date: "2026-11-27", time: "14:00", room: "sala-2", ...just });
    expect(res.ok).toBe(false);
  });

  test("compra feita cria item no inventário em uso no projeto", async () => {
    const info = { name: "Display OLED", category: "Atuador", cabinet: "A2", ownerEixo: "inovacao" as const, quantity: 2, paidValue: 64 };
    expect((await completePurchase(coordSaude(), "r9", info)).ok).toBe(false); // outro eixo
    expect((await completePurchase(coordInovacao(), "r9", { ...info, ownerEixo: "tecnologias-saude" })).ok).toBe(false);
    const res = await completePurchase(coordInovacao(), "r9", info);
    expect(res.ok).toBe(true);
    const item = (await getInventory()).find((i) => i.id === (res as { id: string }).id)!;
    expect(item).toMatchObject({ total: 2, inUse: 2, available: 0, cabinet: "A2", ownerEixo: "inovacao" });
    expect(getDb().projects.find((p) => p.id === "p1")!.components.some((c) => c.componentId === item.id)).toBe(true);
    expect(getDb().requests.find((r) => r.id === "r9")!.progress).toBe("feito");
  });

  test("compra aguardando aparece nos prazos de quem pediu, da coordenação e do projeto", async () => {
    expect((await getRequestDeadlines(byId("m3"))).some((d) => d.request.id === "r9")).toBe(true);
    expect((await getRequestDeadlines(coordInovacao())).some((d) => d.request.id === "r9")).toBe(true);
    expect((await getRequestDeadlines(membroInovacao())).some((d) => d.request.id === "r9")).toBe(false);
    expect((await getProjectPurchases("p1")).some((r) => r.id === "r9")).toBe(true);
  });
});

describe("inventário", () => {
  const item = { name: "Sensor PIR", category: "Sensor", cabinet: "A3", ownerEixo: null, total: 5 };

  test("membro comum não altera; time Processos propõe; coordenação e diretoria aplicam", async () => {
    expect((await createInventoryItem(membroInovacao(), item)).ok).toBe(false); // m2 é Mídias
    expect(await createInventoryItem(byId("m3"), item)).toMatchObject({ ok: true, pending: true }); // m3 é Processos
    expect((await getInventory()).some((i) => i.name === "Sensor PIR")).toBe(false);
    expect(await createInventoryItem(coordInovacao(), item)).toMatchObject({ ok: true });
    expect((await createInventoryItem(diretoria(), { ...item, ownerEixo: "tecnologias-saude" })).ok).toBe(true);
  });

  test("coordenação edita só itens do próprio eixo e sem propriedade", async () => {
    const c7 = getDb().inventory.find((i) => i.id === "c7")!; // Técnico Sustentável
    expect((await updateInventoryItem(coordInovacao(), "c7", { ...c7, cabinet: "A1" })).ok).toBe(false);
    expect((await updateInventoryItem(byId("m5"), "c7", { ...c7, cabinet: "A1" })).ok).toBe(true);
    const c2 = getDb().inventory.find((i) => i.id === "c2")!; // sem propriedade
    expect((await updateInventoryItem(coordSaude(), "c2", { ...c2, cabinet: "C2" })).ok).toBe(true);
  });

  test("não reduz o total abaixo do que está em uso nem exclui item em uso", async () => {
    const c3 = getDb().inventory.find((i) => i.id === "c3")!; // 1 em uso no p2
    expect((await updateInventoryItem(coordInovacao(), "c3", { ...c3, total: 0 })).ok).toBe(false);
    expect((await deleteInventoryItem(coordInovacao(), "c3")).ok).toBe(false);
  });

  test("proposta sem dono: qualquer coordenação aprova; com dono: só a do eixo dono", async () => {
    expect((await resolveProposal(coordSaude(), "ip1", "aplicada", "")).ok).toBe(true); // ESP32 sem dono
    expect(getDb().inventory.find((i) => i.id === "c2")!.cabinet).toBe("C1");
    expect((await resolveProposal(coordSaude(), "ip2", "aplicada", "")).ok).toBe(false); // item de Inovação
    expect((await resolveProposal(coordInovacao(), "ip2", "aplicada", "")).ok).toBe(true);
    expect((await getInventory()).some((i) => i.name === "Sensor de gás MQ-135")).toBe(true);
  });

  test("painel mostra propostas do eixo e as sem propriedade", async () => {
    expect((await getPanelProposals(coordSaude(), "tecnologias-saude")).map((p) => p.id)).toEqual(["ip1"]);
    expect((await getPanelProposals(coordInovacao(), "inovacao")).map((p) => p.id).sort()).toEqual(["ip1", "ip2"]);
  });
});

describe("vínculos", () => {
  test("diretoria sem eixo nem time; coordenadores sem time", () => {
    const d = diretoria();
    expect(d.eixo).toBeNull();
    expect(d.time).toBeNull();
    for (const m of getDb().members.filter((m) => m.role === "coordenador")) expect(m.time).toBeNull();
  });
});

describe("avaliação cruzada", () => {
  test("inclui colegas de todos os eixos, menos o próprio membro", async () => {
    const { colleagues } = await getEvaluationCycle(membroInovacao());
    expect(colleagues.some((c) => c.id === "m2")).toBe(false);
    const eixos = new Set(colleagues.map((c) => c.eixo));
    for (const eixo of ["inovacao", "tecnico-sustentavel", "tecnologias-saude"]) expect(eixos.has(eixo as never)).toBe(true);
  });

  test("avaliação enviada fica salva e aparece para a coordenação do eixo do avaliado", async () => {
    const ratings = { comprometimento: 5, comunicacao: 5, equipe: 5, tecnica: 5, proatividade: 5 };
    expect((await submitEvaluation(byId("m9"), "m3", { ratings, comment: "Ótima!" })).ok).toBe(true);
    expect((await getEvaluationCycle(byId("m9"))).submitted.m3?.comment).toBe("Ótima!");

    const report = (await getMemberEvaluations(coordInovacao(), "m3"))!;
    expect(report.cycles[0]!.evaluations.some((e) => e.evaluatorId === "m9")).toBe(true);
    expect(await getMemberEvaluations(membroInovacao(), "m3")).toBeNull();
    expect(await getMemberEvaluations(coordSaude(), "m3")).toBeNull();
  });

  test("não permite autoavaliação", async () => {
    const ratings = { comprometimento: 5, comunicacao: 5, equipe: 5, tecnica: 5, proatividade: 5 };
    expect((await submitEvaluation(membroInovacao(), "m2", { ratings, comment: "" })).ok).toBe(false);
  });
});
