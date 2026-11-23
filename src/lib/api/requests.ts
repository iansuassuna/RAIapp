import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
  effectiveProgress,
  FINAL_PROGRESS,
  INITIAL_PROGRESS,
  NEXT_PROGRESS,
  PROGRESS_LABEL,
  REQUEST_KIND_LABEL,
  ROOMS,
  requestDeadline,
} from "@/config/requests";
import { type DbOrTx, db, newId } from "@/db";
import { inventoryItems, projectMembers, projects, requestHistory, resourceRequests } from "@/db/schema";
import { todayIso } from "@/lib/format";
import type {
  ActionResult,
  Eixo,
  InventoryItemInput,
  Member,
  RequestDeadline,
  RequestDetails,
  RequestProgress,
  ResourceRequest,
} from "@/types";
import {
  canEditInventoryItem,
  canRequestForProject,
  canResolveRequest,
  canReviewDirectorRequests,
  canReviewEixoRequests,
  requestReviewerFor,
} from "../access";
import { addLoan, allocateToProject, availableQuantity, releaseFromRequest } from "./inventory";
import { directorIds, eixoReviewerIds, notify } from "./notifications";
import { denied, notFound } from "./shared";

/** Entrada de requisição de membro (qualquer tipo, menos "pedido"). */
export type MemberRequestInput = Exclude<RequestDetails, { kind: "pedido" }> & {
  justification: string;
  projectId?: string;
};
/** Entrada de requisição de coordenador à diretoria. */
export type DirectorRequestInput = { kind: "pedido"; title: string; explanation: string; justification: string };
export type RequestInput = MemberRequestInput | DirectorRequestInput;

export type PurchaseCompletion = Omit<InventoryItemInput, "total"> & { quantity: number; paidValue: number };

/* ---------- Hidratação ---------- */

async function hydrateRequests(
  rows: (typeof resourceRequests.$inferSelect)[],
  tx: DbOrTx = db,
): Promise<ResourceRequest[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const historyRows = await tx
    .select()
    .from(requestHistory)
    .where(inArray(requestHistory.requestId, ids))
    .orderBy(asc(requestHistory.at));

  const historyByRequest = new Map<string, ResourceRequest["history"]>();
  for (const h of historyRows) {
    const list = historyByRequest.get(h.requestId) ?? [];
    list.push({ progress: h.progress, by: h.byMemberId ?? "", at: h.at.toISOString() });
    historyByRequest.set(h.requestId, list);
  }

  const today = todayIso();
  return rows.map((row) => {
    const base = {
      id: row.id,
      memberId: row.memberId,
      eixo: row.eixo,
      reviewer: row.reviewer,
      projectId: row.projectId,
      justification: row.justification,
      status: row.status,
      progress: row.progress,
      createdAt: row.createdAt.toISOString(),
      resolution:
        row.resolvedBy && row.resolvedAt
          ? { by: row.resolvedBy, note: row.resolutionNote ?? "", at: row.resolvedAt.toISOString() }
          : undefined,
      history: historyByRequest.get(row.id) ?? [],
      purchase:
        row.purchaseItemId && row.purchasePaidValue !== null && row.purchasedAt
          ? { itemId: row.purchaseItemId, paidValue: row.purchasePaidValue, at: row.purchasedAt.toISOString() }
          : undefined,
      ...row.details,
    } as ResourceRequest;
    return { ...base, progress: effectiveProgress(base, today) };
  });
}

/* ---------- Leitura ---------- */

export async function getMyRequests(viewer: Member): Promise<ResourceRequest[]> {
  const rows = await db
    .select()
    .from(resourceRequests)
    .where(eq(resourceRequests.memberId, viewer.id))
    .orderBy(desc(resourceRequests.createdAt));
  return hydrateRequests(rows);
}

/** Requisições dos membros de um eixo (Painel da Coordenação). Null = sem acesso. */
export async function getEixoRequests(viewer: Member, eixo: Eixo): Promise<ResourceRequest[] | null> {
  if (!canReviewEixoRequests(viewer, eixo)) return null;
  const rows = await db
    .select()
    .from(resourceRequests)
    .where(and(eq(resourceRequests.reviewer, "coordenacao"), eq(resourceRequests.eixo, eixo)))
    .orderBy(desc(resourceRequests.createdAt));
  return hydrateRequests(rows);
}

/** Requisições dos coordenadores (diretoria). Null = sem acesso. */
export async function getDirectorRequests(viewer: Member): Promise<ResourceRequest[] | null> {
  if (!canReviewDirectorRequests(viewer)) return null;
  const rows = await db
    .select()
    .from(resourceRequests)
    .where(eq(resourceRequests.reviewer, "diretoria"))
    .orderBy(desc(resourceRequests.createdAt));
  return hydrateRequests(rows);
}

export async function countPendingRequests(
  filter: { reviewer: "coordenacao"; eixo: Eixo } | { reviewer: "diretoria" },
): Promise<number> {
  const condition =
    filter.reviewer === "diretoria"
      ? and(eq(resourceRequests.status, "pendente"), eq(resourceRequests.reviewer, "diretoria"))
      : and(
          eq(resourceRequests.status, "pendente"),
          eq(resourceRequests.reviewer, "coordenacao"),
          eq(resourceRequests.eixo, filter.eixo),
        );
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(resourceRequests).where(condition);
  return Number(row?.count ?? 0);
}

function toDeadline(r: ResourceRequest): RequestDeadline | null {
  const deadline = requestDeadline(r);
  if (!deadline || !r.progress || FINAL_PROGRESS.includes(r.progress)) return null;
  if (r.kind === "autorizacao" || r.kind === "componente") return null;
  return {
    requestId: r.id,
    title: "",
    kind: r.kind,
    deadline,
    progress: r.progress,
    projectId: r.projectId,
    eixo: r.eixo,
    memberId: r.memberId,
  };
}

/**
 * Prazos vindos de requisições aprovadas e em andamento, para "Prazos e tarefas":
 * as do próprio membro e, para a coordenação, as compras do eixo (ela é responsável por comprar).
 */
export async function getRequestDeadlines(viewer: Member) {
  const filter =
    viewer.role === "coordenador"
      ? and(
          eq(resourceRequests.status, "aprovada"),
          or(
            eq(resourceRequests.memberId, viewer.id),
            and(
              eq(resourceRequests.kind, "compra"),
              eq(resourceRequests.reviewer, "coordenacao"),
              eq(resourceRequests.eixo, viewer.eixo),
            ),
          ),
        )
      : and(eq(resourceRequests.status, "aprovada"), eq(resourceRequests.memberId, viewer.id));

  const rows = await db.select().from(resourceRequests).where(filter);
  const hydrated = await hydrateRequests(rows);
  return hydrated
    .map((r) => ({ request: r, deadline: toDeadline(r) }))
    .filter((x): x is { request: ResourceRequest; deadline: RequestDeadline } => x.deadline !== null)
    .sort((a, b) => a.deadline.deadline.localeCompare(b.deadline.deadline));
}

/** Compras aprovadas vinculadas a um projeto (aparecem nas tarefas do projeto). */
export async function getProjectPurchases(projectId: string): Promise<ResourceRequest[]> {
  const rows = await db
    .select()
    .from(resourceRequests)
    .where(
      and(
        eq(resourceRequests.kind, "compra"),
        eq(resourceRequests.status, "aprovada"),
        eq(resourceRequests.projectId, projectId),
      ),
    );
  const hydrated = await hydrateRequests(rows);
  return hydrated.sort((a, b) => (requestDeadline(a) ?? "").localeCompare(requestDeadline(b) ?? ""));
}

/* ---------- Criação ---------- */

async function roomConflict(tx: DbOrTx, date: string, time: string, room: string, ignoreId?: string) {
  const conditions = [
    eq(resourceRequests.kind, "reuniao"),
    eq(resourceRequests.status, "aprovada"),
    eq(resourceRequests.progress, "agendada"),
    eq(resourceRequests.meetingDate, date),
    eq(resourceRequests.meetingTime, time),
    eq(resourceRequests.meetingRoom, room),
  ];
  if (ignoreId) conditions.push(ne(resourceRequests.id, ignoreId));
  const [conflict] = await tx
    .select({ id: resourceRequests.id })
    .from(resourceRequests)
    .where(and(...conditions))
    .limit(1);
  return Boolean(conflict);
}

export async function createRequest(viewer: Member, input: RequestInput): Promise<ActionResult> {
  const reviewer = requestReviewerFor(viewer);
  if (!reviewer || !viewer.eixo) return { ok: false, error: "A diretoria não faz requisições." };
  if (reviewer === "diretoria" && input.kind !== "pedido") {
    return { ok: false, error: "Coordenadores fazem pedidos à diretoria (título, explicação e justificativa)." };
  }
  if (reviewer === "coordenacao" && input.kind === "pedido") {
    return { ok: false, error: "Escolha um tipo de requisição." };
  }

  return db.transaction(async (tx): Promise<ActionResult> => {
    let projectId: string | null = null;
    if (input.kind !== "pedido" && input.projectId) {
      const [project] = await tx
        .select({ id: projects.id, eixo: projects.eixo })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      const members = project
        ? await tx
            .select({ memberId: projectMembers.memberId })
            .from(projectMembers)
            .where(eq(projectMembers.projectId, project.id))
        : [];
      if (
        !project ||
        !canRequestForProject(viewer, { eixo: project.eixo, memberIds: members.map((m) => m.memberId) })
      ) {
        return {
          ok: false,
          error: "Você só pode vincular projetos aos quais é afiliado.",
          fieldErrors: { projectId: "Projeto inválido." },
        };
      }
      projectId = project.id;
    }

    if (input.kind === "componente") {
      const [comp] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(eq(inventoryItems.id, input.componentId))
        .limit(1);
      if (!comp) {
        return {
          ok: false,
          error: "Escolha um componente do inventário.",
          fieldErrors: { componentId: "Componente inválido." },
        };
      }
    }

    if (input.kind === "reuniao") {
      if (!ROOMS.some((r) => r.value === input.room)) {
        return { ok: false, error: "Sala inválida.", fieldErrors: { room: "Escolha uma sala." } };
      }
      if (await roomConflict(tx, input.date, input.time, input.room)) {
        return {
          ok: false,
          error: "Já há uma reunião agendada nessa sala, data e horário.",
          fieldErrors: { time: "Horário ocupado." },
        };
      }
    }

    const { justification, ...rest } = input;
    const details = { ...rest } as RequestDetails & { projectId?: string };
    delete details.projectId;

    const id = newId("r");
    await tx.insert(resourceRequests).values({
      id,
      memberId: viewer.id,
      eixo: viewer.eixo!,
      reviewer,
      projectId,
      kind: details.kind,
      details,
      meetingDate: details.kind === "reuniao" ? details.date : null,
      meetingTime: details.kind === "reuniao" ? details.time : null,
      meetingRoom: details.kind === "reuniao" ? details.room : null,
      justification,
      status: "pendente",
      progress: null,
    });

    const eixo = viewer.eixo as Eixo;
    await notify(
      tx,
      reviewer === "diretoria" ? await directorIds(tx) : await eixoReviewerIds(tx, eixo),
      {
        type: "requisicao-nova",
        title: `Nova requisição: ${REQUEST_KIND_LABEL[details.kind]}`,
        body: `${viewer.name} · ${shorten(justification)}`,
        href: reviewer === "diretoria" ? "/diretoria" : `/eixos/${eixo}/painel`,
      },
      viewer.id,
    );
    return { ok: true, id };
  });
}

/** Trecho curto para o corpo das notificações. */
function shorten(text: string, max = 120) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/* ---------- Análise ---------- */

/** Aprova ou recusa. Ao aprovar, o pedido ganha o andamento inicial do tipo (e componentes entram em uso). */
export async function resolveRequest(
  viewer: Member,
  requestId: string,
  decision: "aprovada" | "recusada",
  note: string,
): Promise<ActionResult> {
  return db.transaction(async (tx): Promise<ActionResult> => {
    const [row] = await tx.select().from(resourceRequests).where(eq(resourceRequests.id, requestId)).limit(1);
    if (!row) return notFound("Requisição");
    if (!canResolveRequest(viewer, row)) return denied();
    if (row.status !== "pendente") return { ok: false, error: "Esta requisição já foi resolvida." };

    const details = row.details;
    let nextProgress: RequestProgress | null = null;
    const now = new Date();

    if (decision === "aprovada") {
      if (details.kind === "componente") {
        const available = await availableQuantity(details.componentId, tx);
        if (details.quantity > available) {
          return { ok: false, error: `Estoque insuficiente: há ${available} unidade(s) disponível(is).` };
        }
        const allocated = row.projectId
          ? await allocateToProject(tx, row.projectId, details.componentId, details.quantity)
          : false;
        if (!allocated) {
          await addLoan(tx, details.componentId, row.memberId, details.quantity, row.id);
        }
      }
      if (details.kind === "reuniao" && (await roomConflict(tx, details.date, details.time, details.room, row.id))) {
        return { ok: false, error: "Já há uma reunião agendada nessa sala, data e horário." };
      }
      nextProgress = INITIAL_PROGRESS[row.kind];
      await tx.insert(requestHistory).values({
        id: newId("rh"),
        requestId: row.id,
        progress: nextProgress,
        byMemberId: viewer.id,
        at: now,
      });
    }

    await tx
      .update(resourceRequests)
      .set({
        status: decision,
        progress: nextProgress,
        resolvedBy: viewer.id,
        resolutionNote: note,
        resolvedAt: now,
      })
      .where(eq(resourceRequests.id, requestId));

    await notify(
      tx,
      [row.memberId],
      {
        type: "requisicao-resolvida",
        title: `Requisição ${decision === "aprovada" ? "aprovada" : "recusada"}: ${REQUEST_KIND_LABEL[row.kind]}`,
        body: note ? shorten(note) : `Analisada por ${viewer.name}.`,
        href: "/minha-area/requisicoes",
      },
      viewer.id,
    );
    return { ok: true };
  });
}

/** Avança o andamento (ex.: Aguardando liberação → Liberada). Só passos previstos em NEXT_PROGRESS. */
export async function advanceRequest(viewer: Member, requestId: string, to: RequestProgress): Promise<ActionResult> {
  return db.transaction(async (tx): Promise<ActionResult> => {
    const [row] = await tx.select().from(resourceRequests).where(eq(resourceRequests.id, requestId)).limit(1);
    if (!row) return notFound("Requisição");
    if (!canResolveRequest(viewer, row)) return denied();

    const [hydrated] = await hydrateRequests([row], tx);
    const current = hydrated?.progress ?? null;
    const next = current ? NEXT_PROGRESS[row.kind]?.[current] : undefined;
    if (row.status !== "aprovada" || !next || next.to !== to) {
      return { ok: false, error: "Essa mudança de andamento não é permitida agora." };
    }

    if (row.details.kind === "componente" && to === "devolvido") {
      await releaseFromRequest(tx, row.id, row.projectId, row.details.componentId, row.details.quantity);
    }

    const now = new Date();
    await tx.update(resourceRequests).set({ progress: to }).where(eq(resourceRequests.id, requestId));
    await tx.insert(requestHistory).values({
      id: newId("rh"),
      requestId: row.id,
      progress: to,
      byMemberId: viewer.id,
      at: now,
    });
    await notify(
      tx,
      [row.memberId],
      {
        type: "requisicao-andamento",
        title: `${REQUEST_KIND_LABEL[row.kind]}: ${PROGRESS_LABEL[to]}`,
        body: `Andamento atualizado por ${viewer.name}.`,
        href: "/minha-area/requisicoes",
      },
      viewer.id,
    );
    return { ok: true };
  });
}

/**
 * Compra feita: cria o item no inventário (em uso) e o liga ao projeto, ou empresta a quem pediu.
 * A coordenação só pode atribuir o item ao próprio eixo ou deixar sem propriedade.
 */
export async function completePurchase(
  viewer: Member,
  requestId: string,
  info: PurchaseCompletion,
): Promise<ActionResult> {
  return db.transaction(async (tx): Promise<ActionResult> => {
    const [row] = await tx.select().from(resourceRequests).where(eq(resourceRequests.id, requestId)).limit(1);
    if (row?.kind !== "compra") return notFound("Compra");
    if (!canResolveRequest(viewer, row)) return denied();
    if (row.status !== "aprovada" || row.progress !== "aguardando") {
      return { ok: false, error: "Esta compra não está aguardando." };
    }
    if (!canEditInventoryItem(viewer, { ownerEixo: info.ownerEixo })) {
      return {
        ok: false,
        error: "Você só pode atribuir o item ao seu eixo ou deixá-lo sem propriedade.",
        fieldErrors: { ownerEixo: "Eixo não permitido." },
      };
    }

    const { quantity, paidValue, ...item } = info;
    const itemId = newId("c");
    await tx.insert(inventoryItems).values({ id: itemId, ...item, total: quantity });

    const allocated = row.projectId ? await allocateToProject(tx, row.projectId, itemId, quantity) : false;
    if (!allocated) {
      await addLoan(tx, itemId, row.memberId, quantity, row.id);
    }

    const now = new Date();
    await tx
      .update(resourceRequests)
      .set({
        purchaseItemId: itemId,
        purchasePaidValue: paidValue,
        purchasedAt: now,
        progress: "feito",
      })
      .where(eq(resourceRequests.id, requestId));

    await tx.insert(requestHistory).values({
      id: newId("rh"),
      requestId: row.id,
      progress: "feito",
      byMemberId: viewer.id,
      at: now,
    });

    await notify(
      tx,
      [row.memberId],
      {
        type: "requisicao-andamento",
        title: "Compra concluída",
        body: `${item.name} ×${quantity} já está ${allocated ? "no projeto" : "com você"}.`,
        href: "/minha-area/requisicoes",
      },
      viewer.id,
    );
    return { ok: true, id: itemId };
  });
}
