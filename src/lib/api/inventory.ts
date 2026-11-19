import type { ActionResult, Eixo, InventoryAvailability, InventoryItem, InventoryItemInput, InventoryProposal, Member } from "@/types";
import { canApproveInventoryProposal, canEditInventoryItem, canProposeInventoryChange } from "../access";
import { getDb, newId } from "../db";
import { denied, notFound } from "./shared";

/* ---------- Uso e disponibilidade ---------- */

/** Quantidade em uso de um componente: alocada em projetos + emprestada (empréstimos não devolvidos). */
export function usedQuantity(componentId: string) {
  const db = getDb();
  const inProjects = db.projects
    .flatMap((p) => p.components)
    .filter((c) => c.componentId === componentId)
    .reduce((sum, c) => sum + c.quantity, 0);
  const loans = db.loans
    .filter((l) => l.componentId === componentId && !l.returnedAt)
    .reduce((sum, l) => sum + l.quantity, 0);
  return inProjects + loans;
}

function withAvailability(item: InventoryItem): InventoryAvailability {
  const inUse = usedQuantity(item.id);
  return { ...item, inUse, available: Math.max(0, item.total - inUse) };
}

/** Inventário completo com disponibilidade (todos veem tudo, independente de propriedade). */
export async function getInventory(): Promise<InventoryAvailability[]> {
  return getDb()
    .inventory.map(withAvailability)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getInventoryItem(id: string) {
  const item = getDb().inventory.find((i) => i.id === id);
  return item ? withAvailability(item) : null;
}

/** Onde cada unidade em uso está: projetos e empréstimos. */
export async function getInventoryUsage(componentId: string) {
  const db = getDb();
  return {
    projects: db.projects
      .flatMap((p) => p.components.filter((c) => c.componentId === componentId).map((c) => ({ projectId: p.id, eixo: p.eixo, name: p.name, quantity: c.quantity })))
      .filter((p) => p.quantity > 0),
    loans: db.loans.filter((l) => l.componentId === componentId && !l.returnedAt),
  };
}

export function componentName(id: string | null) {
  return getDb().inventory.find((i) => i.id === id)?.name ?? "Componente removido";
}

/* ---------- Alterações (aplicação) ---------- */

function applyCreate(input: InventoryItemInput): ActionResult {
  const item: InventoryItem = { id: newId("c"), ...input };
  getDb().inventory.push(item);
  return { ok: true, id: item.id };
}

function applyUpdate(id: string, input: InventoryItemInput): ActionResult {
  const item = getDb().inventory.find((i) => i.id === id);
  if (!item) return notFound("Item");
  const inUse = usedQuantity(id);
  if (input.total < inUse) {
    return { ok: false, error: `Há ${inUse} unidade(s) em uso; o total não pode ser menor.`, fieldErrors: { total: `Mínimo: ${inUse}.` } };
  }
  Object.assign(item, input);
  return { ok: true, id };
}

function applyDelete(id: string): ActionResult {
  const db = getDb();
  const item = db.inventory.find((i) => i.id === id);
  if (!item) return notFound("Item");
  const inUse = usedQuantity(id);
  if (inUse > 0) return { ok: false, error: `Não é possível excluir: ${inUse} unidade(s) em uso.` };
  db.inventory = db.inventory.filter((i) => i.id !== id);
  return { ok: true };
}

/** Coordenação só atribui o item ao próprio eixo ou deixa sem propriedade. */
function canSetOwner(viewer: Member, ownerEixo: Eixo | null) {
  return canEditInventoryItem(viewer, { ownerEixo });
}

function propose(viewer: Member, proposal: Omit<InventoryProposal, "id" | "proposerId" | "status" | "createdAt">): ActionResult {
  const p: InventoryProposal = { id: newId("ip"), proposerId: viewer.id, status: "pendente", createdAt: new Date().toISOString(), ...proposal };
  getDb().proposals.push(p);
  return { ok: true, id: p.id, pending: true };
}

/* ---------- Alterações (entrada) — aplica direto ou vira proposta ---------- */

export async function createInventoryItem(viewer: Member, input: InventoryItemInput): Promise<ActionResult> {
  if (canSetOwner(viewer, input.ownerEixo)) return applyCreate(input);
  if (canProposeInventoryChange(viewer)) return propose(viewer, { action: "criar", itemId: null, data: input });
  return denied();
}

export async function updateInventoryItem(viewer: Member, id: string, input: InventoryItemInput): Promise<ActionResult> {
  const item = getDb().inventory.find((i) => i.id === id);
  if (!item) return notFound("Item");
  if (canEditInventoryItem(viewer, item) && canSetOwner(viewer, input.ownerEixo)) return applyUpdate(id, input);
  if (canProposeInventoryChange(viewer)) {
    if (input.total < usedQuantity(id)) return applyUpdate(id, input); // devolve o mesmo erro de validação
    return propose(viewer, { action: "editar", itemId: id, data: input });
  }
  return denied();
}

export async function deleteInventoryItem(viewer: Member, id: string): Promise<ActionResult> {
  const item = getDb().inventory.find((i) => i.id === id);
  if (!item) return notFound("Item");
  if (canEditInventoryItem(viewer, item)) return applyDelete(id);
  if (canProposeInventoryChange(viewer)) return propose(viewer, { action: "excluir", itemId: id, data: null });
  return denied();
}

/* ---------- Propostas ---------- */

/** Eixo que decide a proposta: dono atual do item (ou o dono proposto, ao criar). */
export function proposalOwner(p: InventoryProposal): Eixo | null {
  if (p.action === "criar") return p.data?.ownerEixo ?? null;
  return getDb().inventory.find((i) => i.id === p.itemId)?.ownerEixo ?? null;
}

/** Propostas pendentes que aparecem no Painel da Coordenação do eixo (do eixo + sem propriedade). */
export async function getPanelProposals(viewer: Member, eixo: Eixo) {
  return getDb()
    .proposals.filter((p) => p.status === "pendente")
    .filter((p) => {
      const owner = proposalOwner(p);
      return (owner === eixo || owner === null) && canApproveInventoryProposal(viewer, owner);
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getMyProposals(viewer: Member) {
  return getDb()
    .proposals.filter((p) => p.proposerId === viewer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function resolveProposal(viewer: Member, id: string, decision: "aplicada" | "recusada", note: string): Promise<ActionResult> {
  const p = getDb().proposals.find((x) => x.id === id);
  if (!p) return notFound("Proposta");
  if (p.status !== "pendente") return { ok: false, error: "Esta proposta já foi resolvida." };
  if (!canApproveInventoryProposal(viewer, proposalOwner(p))) return denied();

  if (decision === "aplicada") {
    const result =
      p.action === "criar" ? applyCreate(p.data!) : p.action === "editar" ? applyUpdate(p.itemId!, p.data!) : applyDelete(p.itemId!);
    if (!result.ok) return result;
  }
  p.status = decision;
  p.resolution = { by: viewer.id, note, at: new Date().toISOString() };
  return { ok: true };
}

/* ---------- Uso por requisições (interno a lib/api) ---------- */

export function addLoan(componentId: string, memberId: string, quantity: number, requestId: string | null) {
  getDb().loans.push({ id: newId("l"), componentId, memberId, quantity, requestId, returnedAt: null });
}

export function availableQuantity(componentId: string) {
  const item = getDb().inventory.find((i) => i.id === componentId);
  return item ? item.total - usedQuantity(componentId) : 0;
}

/** Inclui (ou soma) um componente nos componentes do projeto. */
export function allocateToProject(projectId: string, componentId: string, quantity: number) {
  const project = getDb().projects.find((p) => p.id === projectId);
  if (!project) return false;
  const existing = project.components.find((c) => c.componentId === componentId);
  if (existing) existing.quantity += quantity;
  else project.components.push({ componentId, quantity });
  return true;
}

/** Devolve ao inventário: tira do projeto (até a quantidade) ou encerra o empréstimo da requisição. */
export function releaseFromRequest(requestId: string, projectId: string | null, componentId: string, quantity: number) {
  const db = getDb();
  const loan = db.loans.find((l) => l.requestId === requestId && !l.returnedAt);
  if (loan) {
    loan.returnedAt = new Date().toISOString();
    return;
  }
  const project = projectId ? db.projects.find((p) => p.id === projectId) : undefined;
  const alloc = project?.components.find((c) => c.componentId === componentId);
  if (project && alloc) {
    alloc.quantity -= Math.min(quantity, alloc.quantity);
    project.components = project.components.filter((c) => c.quantity > 0);
  }
}
