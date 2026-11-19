import { effectiveProgress, FINAL_PROGRESS, INITIAL_PROGRESS, NEXT_PROGRESS, requestDeadline, ROOMS } from "@/config/requests";
import { todayIso } from "@/lib/format";
import type { ActionResult, Eixo, InventoryItemInput, Member, RequestDeadline, RequestDetails, RequestProgress, ResourceRequest } from "@/types";
import { canEditInventoryItem, canRequestForProject, canResolveRequest, canReviewDirectorRequests, canReviewEixoRequests, requestReviewerFor } from "../access";
import { getDb, newId } from "../db";
import { addLoan, allocateToProject, availableQuantity, releaseFromRequest } from "./inventory";
import { denied, notFound } from "./shared";

/** Entrada de requisição de membro (qualquer tipo, menos "pedido"). */
export type MemberRequestInput = Exclude<RequestDetails, { kind: "pedido" }> & { justification: string; projectId?: string };
/** Entrada de requisição de coordenador à diretoria. */
export type DirectorRequestInput = { kind: "pedido"; title: string; explanation: string; justification: string };
export type RequestInput = MemberRequestInput | DirectorRequestInput;

export type PurchaseCompletion = Omit<InventoryItemInput, "total"> & { quantity: number; paidValue: number };

const byNewest = (a: ResourceRequest, b: ResourceRequest) => b.createdAt.localeCompare(a.createdAt);

/** Aplica o andamento efetivo (reunião passada → realizada, autorização vencida → expirada). */
function effective(r: ResourceRequest): ResourceRequest {
  return { ...r, progress: effectiveProgress(r, todayIso()) };
}

/* ---------- Leitura ---------- */

export async function getMyRequests(viewer: Member) {
  return getDb().requests.filter((r) => r.memberId === viewer.id).map(effective).sort(byNewest);
}

/** Requisições dos membros de um eixo (Painel da Coordenação). Null = sem acesso. */
export async function getEixoRequests(viewer: Member, eixo: Eixo) {
  if (!canReviewEixoRequests(viewer, eixo)) return null;
  return getDb()
    .requests.filter((r) => r.reviewer === "coordenacao" && r.eixo === eixo)
    .map(effective)
    .sort(byNewest);
}

/** Requisições dos coordenadores (diretoria). Null = sem acesso. */
export async function getDirectorRequests(viewer: Member) {
  if (!canReviewDirectorRequests(viewer)) return null;
  return getDb()
    .requests.filter((r) => r.reviewer === "diretoria")
    .map(effective)
    .sort(byNewest);
}

export function countPendingRequests(filter: { reviewer: "coordenacao"; eixo: Eixo } | { reviewer: "diretoria" }) {
  return getDb().requests.filter(
    (r) => r.status === "pendente" && r.reviewer === filter.reviewer && (filter.reviewer === "diretoria" || r.eixo === filter.eixo),
  ).length;
}

function toDeadline(r: ResourceRequest): RequestDeadline | null {
  const deadline = requestDeadline(r);
  if (!deadline || !r.progress || FINAL_PROGRESS.includes(r.progress)) return null;
  if (r.kind === "autorizacao" || r.kind === "componente") return null; // não são prazos de entrega
  return { requestId: r.id, title: "", kind: r.kind, deadline, progress: r.progress, projectId: r.projectId, eixo: r.eixo, memberId: r.memberId };
}

/**
 * Prazos vindos de requisições aprovadas e em andamento, para "Prazos e tarefas":
 * as do próprio membro e, para a coordenação, as compras do eixo (ela é responsável por comprar).
 */
export async function getRequestDeadlines(viewer: Member) {
  return getDb()
    .requests.map(effective)
    .filter((r) => r.status === "aprovada")
    .filter(
      (r) =>
        r.memberId === viewer.id ||
        (r.kind === "compra" && r.reviewer === "coordenacao" && viewer.role === "coordenador" && r.eixo === viewer.eixo),
    )
    .map((r) => ({ request: r, deadline: toDeadline(r) }))
    .filter((x): x is { request: ResourceRequest; deadline: RequestDeadline } => x.deadline !== null)
    .sort((a, b) => a.deadline.deadline.localeCompare(b.deadline.deadline));
}

/** Compras aprovadas vinculadas a um projeto (aparecem nas tarefas do projeto). */
export async function getProjectPurchases(projectId: string) {
  return getDb()
    .requests.filter((r) => r.kind === "compra" && r.status === "aprovada" && r.projectId === projectId)
    .map(effective)
    .sort((a, b) => (requestDeadline(a) ?? "").localeCompare(requestDeadline(b) ?? ""));
}

/* ---------- Criação ---------- */

function roomConflict(date: string, time: string, room: string, ignoreId?: string) {
  return getDb().requests.some(
    (r) =>
      r.id !== ignoreId &&
      r.kind === "reuniao" &&
      r.status === "aprovada" &&
      r.progress === "agendada" &&
      r.date === date &&
      r.time === time &&
      r.room === room,
  );
}

export async function createRequest(viewer: Member, input: RequestInput): Promise<ActionResult> {
  const db = getDb();
  const reviewer = requestReviewerFor(viewer);
  if (!reviewer || !viewer.eixo) return { ok: false, error: "A diretoria não faz requisições." };
  if (reviewer === "diretoria" && input.kind !== "pedido") return { ok: false, error: "Coordenadores fazem pedidos à diretoria (título, explicação e justificativa)." };
  if (reviewer === "coordenacao" && input.kind === "pedido") return { ok: false, error: "Escolha um tipo de requisição." };

  let projectId: string | null = null;
  if (input.kind !== "pedido" && input.projectId) {
    const project = db.projects.find((p) => p.id === input.projectId);
    if (!project || !canRequestForProject(viewer, project)) {
      return { ok: false, error: "Você só pode vincular projetos aos quais é afiliado.", fieldErrors: { projectId: "Projeto inválido." } };
    }
    projectId = project.id;
  }

  if (input.kind === "componente" && !db.inventory.some((i) => i.id === input.componentId)) {
    return { ok: false, error: "Escolha um componente do inventário.", fieldErrors: { componentId: "Componente inválido." } };
  }
  if (input.kind === "reuniao") {
    if (!ROOMS.some((r) => r.value === input.room)) return { ok: false, error: "Sala inválida.", fieldErrors: { room: "Escolha uma sala." } };
    if (roomConflict(input.date, input.time, input.room)) {
      return { ok: false, error: "Já há uma reunião agendada nessa sala, data e horário.", fieldErrors: { time: "Horário ocupado." } };
    }
  }

  const { justification, ...rest } = input;
  const details = { ...rest } as RequestDetails & { projectId?: string };
  delete details.projectId;
  const request = {
    id: newId("r"),
    memberId: viewer.id,
    eixo: viewer.eixo,
    reviewer,
    projectId,
    justification,
    status: "pendente",
    progress: null,
    createdAt: new Date().toISOString(),
    history: [],
    ...details,
  } as ResourceRequest;
  db.requests.push(request);
  return { ok: true, id: request.id };
}

/* ---------- Análise ---------- */

/** Aprova ou recusa. Ao aprovar, o pedido ganha o andamento inicial do tipo (e componentes entram em uso). */
export async function resolveRequest(viewer: Member, requestId: string, decision: "aprovada" | "recusada", note: string): Promise<ActionResult> {
  const request = getDb().requests.find((r) => r.id === requestId);
  if (!request) return notFound("Requisição");
  if (!canResolveRequest(viewer, request)) return denied();
  if (request.status !== "pendente") return { ok: false, error: "Esta requisição já foi resolvida." };

  if (decision === "aprovada") {
    if (request.kind === "componente") {
      const available = availableQuantity(request.componentId);
      if (request.quantity > available) return { ok: false, error: `Estoque insuficiente: há ${available} unidade(s) disponível(is).` };
      if (!request.projectId || !allocateToProject(request.projectId, request.componentId, request.quantity)) {
        addLoan(request.componentId, request.memberId, request.quantity, request.id);
      }
    }
    if (request.kind === "reuniao" && roomConflict(request.date, request.time, request.room, request.id)) {
      return { ok: false, error: "Já há uma reunião agendada nessa sala, data e horário." };
    }
    request.progress = INITIAL_PROGRESS[request.kind];
    request.history.push({ progress: request.progress, by: viewer.id, at: new Date().toISOString() });
  }

  request.status = decision;
  request.resolution = { by: viewer.id, note, at: new Date().toISOString() };
  return { ok: true };
}

/** Avança o andamento (ex.: Aguardando liberação → Liberada). Só passos previstos em NEXT_PROGRESS. */
export async function advanceRequest(viewer: Member, requestId: string, to: RequestProgress): Promise<ActionResult> {
  const request = getDb().requests.find((r) => r.id === requestId);
  if (!request) return notFound("Requisição");
  if (!canResolveRequest(viewer, request)) return denied();
  const current = effectiveProgress(request, todayIso());
  const next = current ? NEXT_PROGRESS[request.kind]?.[current] : undefined;
  if (request.status !== "aprovada" || !next || next.to !== to) return { ok: false, error: "Essa mudança de andamento não é permitida agora." };

  if (request.kind === "componente" && to === "devolvido") {
    releaseFromRequest(request.id, request.projectId, request.componentId, request.quantity);
  }
  request.progress = to;
  request.history.push({ progress: to, by: viewer.id, at: new Date().toISOString() });
  return { ok: true };
}

/**
 * Compra feita: cria o item no inventário (em uso) e o liga ao projeto, ou empresta a quem pediu.
 * A coordenação só pode atribuir o item ao próprio eixo ou deixar sem propriedade.
 */
export async function completePurchase(viewer: Member, requestId: string, info: PurchaseCompletion): Promise<ActionResult> {
  const db = getDb();
  const request = db.requests.find((r) => r.id === requestId);
  if (!request || request.kind !== "compra") return notFound("Compra");
  if (!canResolveRequest(viewer, request)) return denied();
  if (request.status !== "aprovada" || request.progress !== "aguardando") return { ok: false, error: "Esta compra não está aguardando." };
  if (!canEditInventoryItem(viewer, { ownerEixo: info.ownerEixo })) {
    return { ok: false, error: "Você só pode atribuir o item ao seu eixo ou deixá-lo sem propriedade.", fieldErrors: { ownerEixo: "Eixo não permitido." } };
  }

  const { quantity, paidValue, ...item } = info;
  const itemId = newId("c");
  db.inventory.push({ id: itemId, ...item, total: quantity });
  if (!request.projectId || !allocateToProject(request.projectId, itemId, quantity)) {
    addLoan(itemId, request.memberId, quantity, request.id);
  }
  const at = new Date().toISOString();
  request.purchase = { itemId, paidValue, at };
  request.progress = "feito";
  request.history.push({ progress: "feito", by: viewer.id, at });
  return { ok: true, id: itemId };
}
