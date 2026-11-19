import type { ActionResult, Eixo, Member, RequestKind, ResourceRequest } from "@/types";
import { canRequestForProject, canResolveRequest, canReviewDirectorRequests, canReviewEixoRequests, requestReviewerFor } from "../access";
import { getDb, newId } from "../db";
import { usedQuantity } from "./inventory";
import { denied, notFound } from "./shared";

export type RequestInput = {
  kind: RequestKind;
  componentId?: string;
  quantity: number;
  description?: string;
  justification: string;
  projectId?: string;
};

const byNewest = (a: ResourceRequest, b: ResourceRequest) => b.createdAt.localeCompare(a.createdAt);

export async function getMyRequests(viewer: Member) {
  return getDb().requests.filter((r) => r.memberId === viewer.id).sort(byNewest);
}

/** Fila de requisições dos membros do eixo (coordenação). Null = sem acesso. */
export async function getEixoRequests(viewer: Member, eixo: Eixo) {
  if (!canReviewEixoRequests(viewer, eixo)) return null;
  return getDb()
    .requests.filter((r) => r.reviewer === "coordenacao" && r.eixo === eixo)
    .sort(byNewest);
}

/** Fila de requisições dos coordenadores (diretoria). Null = sem acesso. */
export async function getDirectorRequests(viewer: Member) {
  if (!canReviewDirectorRequests(viewer)) return null;
  return getDb()
    .requests.filter((r) => r.reviewer === "diretoria")
    .sort(byNewest);
}

export function countPendingRequests(filter: { reviewer: "coordenacao"; eixo: Eixo } | { reviewer: "diretoria" }) {
  return getDb().requests.filter(
    (r) => r.status === "pendente" && r.reviewer === filter.reviewer && (filter.reviewer === "diretoria" || r.eixo === filter.eixo),
  ).length;
}

export async function createRequest(viewer: Member, input: RequestInput): Promise<ActionResult> {
  const db = getDb();
  const reviewer = requestReviewerFor(viewer);
  if (!reviewer || !viewer.eixo) return { ok: false, error: "A diretoria não faz requisições." };
  let projectId: string | null = null;
  if (input.projectId) {
    const project = db.projects.find((p) => p.id === input.projectId);
    if (!project || !canRequestForProject(viewer, project)) {
      return { ok: false, error: "Você só pode vincular projetos aos quais é afiliado.", fieldErrors: { projectId: "Projeto inválido." } };
    }
    projectId = project.id;
  }
  if (input.kind === "componente" && !db.inventory.some((i) => i.id === input.componentId)) {
    return { ok: false, error: "Escolha um componente do inventário.", fieldErrors: { componentId: "Componente inválido." } };
  }
  const request: ResourceRequest = {
    id: newId("r"),
    memberId: viewer.id,
    eixo: viewer.eixo,
    reviewer,
    projectId,
    kind: input.kind,
    componentId: input.kind === "componente" ? input.componentId! : null,
    quantity: input.quantity,
    description: input.kind === "recurso" ? (input.description ?? "") : "",
    justification: input.justification,
    status: "pendente",
    createdAt: new Date().toISOString(),
  };
  db.requests.push(request);
  return { ok: true, id: request.id };
}

/**
 * Coordenação (requisições de membros) ou diretoria (requisições de coordenadores) aprova ou recusa. Ao aprovar um componente vinculado a projeto,
 * ele é alocado ao projeto; sem projeto, conta como empréstimo ao membro.
 */
export async function resolveRequest(
  viewer: Member,
  requestId: string,
  decision: "aprovada" | "recusada",
  note: string,
): Promise<ActionResult> {
  const db = getDb();
  const request = db.requests.find((r) => r.id === requestId);
  if (!request) return notFound("Requisição");
  if (!canResolveRequest(viewer, request)) return denied();
  if (request.status !== "pendente") return { ok: false, error: "Esta requisição já foi resolvida." };

  if (decision === "aprovada" && request.kind === "componente" && request.componentId) {
    const item = db.inventory.find((i) => i.id === request.componentId);
    if (!item) return notFound("Componente");
    const available = item.total - usedQuantity(item.id);
    if (request.quantity > available) {
      return { ok: false, error: `Estoque insuficiente: há ${available} unidade(s) de ${item.name} disponível(is).` };
    }
    const project = request.projectId ? db.projects.find((p) => p.id === request.projectId) : undefined;
    if (project) {
      const existing = project.components.find((c) => c.componentId === item.id);
      if (existing) existing.quantity += request.quantity;
      else project.components.push({ componentId: item.id, quantity: request.quantity });
    }
  }

  request.status = decision;
  request.resolution = { by: viewer.id, note, at: new Date().toISOString() };
  return { ok: true };
}
