import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db, sqlClient } from "@/db";
import { notifications } from "@/db/schema";
import { resetTestDatabase } from "@/db/seed";
import {
  addTask,
  advanceRequest,
  createActivity,
  createInventoryItem,
  createRequest,
  getCurrentCycle,
  getMember,
  getNotificationSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  NOTIFICATIONS_CHANNEL,
  notify,
  resolveProposal,
  resolveRequest,
  updateMemberRole,
  updateProject,
  updateTaskStatus,
} from "@/lib/api";
import { decodeSignal } from "@/lib/api/notifications";
import type { Member, NotificationType } from "@/types";

async function byId(id: string): Promise<Member> {
  const m = await getMember(id);
  if (!m) throw new Error(`Membro ${id} não encontrado.`);
  return m;
}

async function inbox(recipientId: string, type?: NotificationType) {
  return db
    .select()
    .from(notifications)
    .where(
      type
        ? and(eq(notifications.recipientId, recipientId), eq(notifications.type, type))
        : eq(notifications.recipientId, recipientId),
    );
}

const just = { justification: "Necessário para o projeto do eixo." };

beforeEach(async () => {
  await resetTestDatabase();
});

describe("eventos geram notificações para as pessoas certas", () => {
  test("requisição nova avisa a coordenação do eixo (não quem pediu); decisão e andamento avisam quem pediu", async () => {
    const bruno = await byId("m2");
    const created = await createRequest(bruno, {
      kind: "outros",
      explanation: "Camisetas do eixo",
      date: null,
      ...just,
    });
    if (!created.ok || !created.id) throw new Error("fixture");

    const [toAna] = await inbox("m1", "requisicao-nova");
    expect(toAna).toMatchObject({ href: "/eixos/inovacao/painel" });
    expect(toAna?.body).toContain("Bruno Lima");
    expect(await inbox("m2")).toHaveLength(0);
    expect(await inbox("m5", "requisicao-nova")).toHaveLength(0);

    const ana = await byId("m1");
    await resolveRequest(ana, created.id, "aprovada", "Pode pedir.");
    const [decision] = await inbox("m2", "requisicao-resolvida");
    expect(decision).toMatchObject({
      title: "Requisição aprovada: Outros",
      body: "Pode pedir.",
      href: "/minha-area/requisicoes",
    });

    await advanceRequest(ana, created.id, "feito");
    expect(await inbox("m2", "requisicao-andamento")).toHaveLength(1);
    expect(await inbox("m1", "requisicao-resolvida")).toHaveLength(0);
  });

  test("pedido de coordenador avisa a diretoria", async () => {
    await createRequest(await byId("m1"), { kind: "pedido", title: "Kit", explanation: "10 kits", ...just });
    expect(await inbox("d1", "requisicao-nova")).toMatchObject([{ href: "/diretoria" }]);
  });

  test("proposta do time Processos avisa a coordenação do eixo dono; a decisão avisa quem propôs", async () => {
    const item = { name: "Sensor PIR", category: "Sensor", cabinet: "A3", ownerEixo: "inovacao" as const, total: 5 };
    const proposal = await createInventoryItem(await byId("m3"), item);
    if (!proposal.ok || !proposal.id) throw new Error("fixture");

    const [toAna] = await inbox("m1", "proposta-nova");
    expect(toAna?.body).toContain('criar "Sensor PIR"');
    await resolveProposal(await byId("m1"), proposal.id, "recusada", "Já temos estoque.");
    expect(await inbox("m3", "proposta-resolvida")).toMatchObject([
      { title: "Proposta recusada", body: "Já temos estoque." },
    ]);
  });

  test("tarefas: atribuição avisa o responsável; conclusão pelo responsável avisa a coordenação", async () => {
    const ana = await byId("m1");
    await addTask(ana, "p1", { title: "Montar o regulamento", assigneeId: "m2", deadline: "2026-12-01" });
    expect(await inbox("m2", "tarefa-atribuida")).toMatchObject([{ title: "Nova tarefa: Montar o regulamento" }]);

    await updateTaskStatus(await byId("m2"), "p1", "t2", "concluida");
    expect(await inbox("m1", "tarefa-atualizada")).toHaveLength(1);
    await updateTaskStatus(ana, "p1", "t3", "em-andamento");
    expect(await inbox("m3", "tarefa-atualizada")).toHaveLength(1);
    // Mesmo status de novo não gera aviso.
    await updateTaskStatus(ana, "p1", "t3", "em-andamento");
    expect(await inbox("m3", "tarefa-atualizada")).toHaveLength(1);
  });

  test("editar projeto avisa só quem entrou", async () => {
    await updateProject(await byId("m1"), "p1", {
      name: "Hackathon interno",
      status: "em-andamento",
      startDate: "2026-10-01",
      deadline: "2026-11-30",
      memberIds: ["m1", "m2", "m3", "m4"],
    });
    expect(await inbox("m4", "projeto-adicionado")).toHaveLength(1);
    expect(await inbox("m2", "projeto-adicionado")).toHaveLength(0);
  });

  test("mudança de papel avisa o membro; pontos avisam quem recebeu", async () => {
    await updateMemberRole(await byId("d1"), "m4", { role: "membro", eixo: "inovacao", time: "processos" });
    expect((await inbox("m4", "papel-alterado"))[0]?.body).toContain("Processos · Inovação");

    await createActivity(await byId("m1"), "m2", {
      title: "Capacitação de Git",
      type: "capacitacao",
      date: "2026-11-20",
      status: "concluida",
      points: 10,
    });
    expect(await inbox("m2", "pontos")).toMatchObject([{ title: "+10 pontos", href: "/atividades" }]);
  });

  test("ciclo novo avisa todo mundo uma única vez, mesmo com criações concorrentes", async () => {
    await Promise.all([getCurrentCycle("2026-12-03"), getCurrentCycle("2026-12-03"), getCurrentCycle("2026-12-04")]);
    const rows = await db.select().from(notifications).where(eq(notifications.type, "ciclo-novo"));
    expect(rows).toHaveLength(11);
    expect(new Set(rows.map((r) => r.recipientId)).size).toBe(11);
  });
});

describe("transação: sem commit, sem notificação", () => {
  test("requisição recusada pela validação não notifica ninguém", async () => {
    const res = await resolveRequest(await byId("m1"), "r-inexistente", "aprovada", "");
    expect(res.ok).toBe(false);
    expect(await db.select().from(notifications)).toHaveLength(0);
  });

  test("erro depois do notify desfaz a notificação", async () => {
    await expect(
      db.transaction(async (tx) => {
        await notify(tx, ["m2"], { type: "pontos", title: "+1 ponto" });
        throw new Error("falha depois do evento");
      }),
    ).rejects.toThrow("falha depois do evento");
    expect(await inbox("m2")).toHaveLength(0);
  });
});

describe("tempo real (LISTEN/NOTIFY)", () => {
  let stop: (() => Promise<void>) | null = null;
  afterEach(async () => {
    await stop?.();
    stop = null;
  });

  test("o sinal chega só depois do commit e carrega destinatário e notificação", async () => {
    const received: string[] = [];
    const listener = await sqlClient.listen(NOTIFICATIONS_CHANNEL, (payload) => received.push(payload));
    stop = () => listener.unlisten();

    await db
      .transaction(async (tx) => {
        await notify(tx, ["m2"], { type: "pontos", title: "desfeita" });
        throw new Error("rollback");
      })
      .catch(() => undefined);

    await db.transaction(async (tx) => notify(tx, ["m2", "m4"], { type: "pontos", title: "+5 pontos" }, "m4"));
    await Bun.sleep(300);

    expect(received).toHaveLength(1);
    const signal = decodeSignal(received[0] ?? "");
    expect(signal?.recipientId).toBe("m2");
    const [row] = await inbox("m2");
    expect(signal?.notificationId).toBe(row?.id);
    expect(row?.title).toBe("+5 pontos");
  });
});

describe("leitura e marcação (só as próprias)", () => {
  async function seedInbox(count: number) {
    for (let i = 0; i < count; i++) {
      await db.transaction((tx) => notify(tx, ["m2"], { type: "pontos", title: `Aviso ${i}` }));
    }
  }

  test("resumo, marcar uma, marcar todas", async () => {
    await seedInbox(3);
    const bruno = await byId("m2");
    const summary = await getNotificationSummary(bruno);
    expect(summary.unread).toBe(3);

    const first = summary.items[0];
    if (!first) throw new Error("fixture");
    expect((await markNotificationsRead(bruno, [first.id])).ok).toBe(true);
    expect((await getNotificationSummary(bruno)).unread).toBe(2);

    expect((await markAllNotificationsRead(bruno)).ok).toBe(true);
    expect((await getNotificationSummary(bruno)).unread).toBe(0);
  });

  test("ninguém marca nem lê notificações de outra pessoa", async () => {
    await seedInbox(1);
    const [row] = await inbox("m2");
    if (!row) throw new Error("fixture");

    const diego = await byId("m4");
    expect((await markNotificationsRead(diego, [row.id])).ok).toBe(false);
    await markAllNotificationsRead(diego);
    expect((await inbox("m2"))[0]?.readAt).toBeNull();
    expect((await getNotificationSummary(diego)).items).toHaveLength(0);
  });

  test("histórico paginado por cursor sem repetir nem pular", async () => {
    await seedInbox(25);
    const bruno = await byId("m2");
    const first = await listNotifications(bruno, null, 10);
    const second = await listNotifications(bruno, first.nextCursor, 10);
    const third = await listNotifications(bruno, second.nextCursor, 10);

    expect([first.items.length, second.items.length, third.items.length]).toEqual([10, 10, 5]);
    expect(third.nextCursor).toBeNull();
    const ids = [...first.items, ...second.items, ...third.items].map((i) => i.id);
    expect(new Set(ids).size).toBe(25);
  });
});
