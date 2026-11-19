import { beforeEach, describe, expect, test } from "bun:test";
import { getDb, resetDb } from "../db";
import {
  addTask,
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

describe("requisições", () => {
  test("membro só vincula projetos aos quais é afiliado", async () => {
    const base = { kind: "componente" as const, componentId: "c1", quantity: 1, justification: "Preciso para testes." };
    expect((await createRequest(membroInovacao(), { ...base, projectId: "p1" })).ok).toBe(true); // m2 está no p1
    expect((await createRequest(byId("m4"), { ...base, projectId: "p1" })).ok).toBe(false); // m4 não está no p1
  });

  test("só a coordenação do eixo vê e resolve a fila", async () => {
    expect(await getEixoRequests(membroInovacao(), "inovacao")).toBeNull();
    expect(await getEixoRequests(diretoria(), "inovacao")).toBeNull();
    expect((await getEixoRequests(coordInovacao(), "inovacao"))!.every((r) => r.eixo === "inovacao")).toBe(true);
    expect((await resolveRequest(coordSaude(), "r1", "aprovada", "")).ok).toBe(false);
  });

  test("aprovar componente com projeto aloca no projeto e baixa o estoque", async () => {
    const before = (await getInventory()).find((i) => i.id === "c4")!.available;
    expect((await resolveRequest(coordInovacao(), "r1", "aprovada", "Ok")).ok).toBe(true);
    expect(getDb().projects.find((p) => p.id === "p1")!.components.find((c) => c.componentId === "c4")?.quantity).toBe(4);
    expect((await getInventory()).find((i) => i.id === "c4")!.available).toBe(before - 4);
    expect((await resolveRequest(coordInovacao(), "r1", "recusada", "x")).ok).toBe(false); // já resolvida
  });

  test("não aprova sem estoque", async () => {
    // c7 (painel solar): 4 no total, 2 no p3; r4 pede 2 → ok; depois outro pedido de 1 → falha
    expect((await resolveRequest(coordSaude(), "r4", "aprovada", "")).ok).toBe(false); // eixo errado
    expect((await resolveRequest(byId("m5"), "r4", "aprovada", "")).ok).toBe(true);
    await createRequest(byId("m6"), { kind: "componente", componentId: "c7", quantity: 1, justification: "Mais um painel." });
    const extra = getDb().requests.find((r) => r.memberId === "m6" && r.status === "pendente")!;
    expect((await resolveRequest(byId("m5"), extra.id, "aprovada", "")).ok).toBe(false);
  });
});

describe("requisições de coordenadores → diretoria", () => {
  const pedido = { kind: "componente" as const, componentId: "c1", quantity: 1, justification: "Kit para a capacitação do eixo." };

  test("coordenador pede à diretoria; membro pede à coordenação", async () => {
    await createRequest(coordInovacao(), pedido);
    await createRequest(membroInovacao(), pedido);
    const requests = getDb().requests;
    expect(requests.find((r) => r.memberId === "m1" && r.componentId === "c1")?.reviewer).toBe("diretoria");
    expect(requests.find((r) => r.memberId === "m2" && r.componentId === "c1")?.reviewer).toBe("coordenacao");
  });

  test("diretoria não faz requisições", async () => {
    expect((await createRequest(diretoria(), pedido)).ok).toBe(false);
  });

  test("só a diretoria vê e resolve as requisições dos coordenadores", async () => {
    const queue = (await getDirectorRequests(diretoria()))!;
    expect(queue.length).toBeGreaterThan(0);
    expect(queue.every((r) => r.reviewer === "diretoria")).toBe(true);
    expect(await getDirectorRequests(coordInovacao())).toBeNull();

    // r7: pedido da coordenação de Inovação — nem ela mesma resolve
    expect((await resolveRequest(coordInovacao(), "r7", "aprovada", "")).ok).toBe(false);
    expect((await resolveRequest(diretoria(), "r7", "aprovada", "")).ok).toBe(true);
    // e a diretoria não resolve requisições de membros
    expect((await resolveRequest(diretoria(), "r1", "aprovada", "")).ok).toBe(false);
  });

  test("fila do eixo não mostra requisições da coordenação", async () => {
    const queue = (await getEixoRequests(coordInovacao(), "inovacao"))!;
    expect(queue.some((r) => r.id === "r7")).toBe(false);
  });

  test("coordenador vincula qualquer projeto do próprio eixo", async () => {
    // m1 não é afiliado ao p2, mas coordena o eixo
    expect((await createRequest(coordInovacao(), { ...pedido, projectId: "p2" })).ok).toBe(true);
    expect((await createRequest(coordInovacao(), { ...pedido, projectId: "p3" })).ok).toBe(false);
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
