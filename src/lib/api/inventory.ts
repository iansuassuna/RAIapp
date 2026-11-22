import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { type DbOrTx, db, newId } from "@/db";
import { inventoryItems, inventoryProposals, loans, projectComponents, projects } from "@/db/schema";
import type {
  ActionResult,
  Eixo,
  InventoryAvailability,
  InventoryItem,
  InventoryItemInput,
  InventoryProposal,
  Loan,
  Member,
} from "@/types";
import { canApproveInventoryProposal, canEditInventoryItem, canProposeInventoryChange } from "../access";
import { denied, notFound } from "./shared";

/* ---------- Mappers ---------- */

function mapItem(row: typeof inventoryItems.$inferSelect): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    cabinet: row.cabinet,
    ownerEixo: row.ownerEixo,
    total: row.total,
  };
}

function mapProposal(row: typeof inventoryProposals.$inferSelect): InventoryProposal {
  return {
    id: row.id,
    proposerId: row.proposerId,
    action: row.action,
    itemId: row.itemId,
    data: row.data,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolution:
      row.resolvedBy && row.resolvedAt
        ? { by: row.resolvedBy, note: row.resolutionNote ?? "", at: row.resolvedAt.toISOString() }
        : undefined,
  };
}

function mapLoan(row: typeof loans.$inferSelect): Loan {
  return {
    id: row.id,
    componentId: row.componentId,
    memberId: row.memberId,
    quantity: row.quantity,
    requestId: row.requestId,
    returnedAt: row.returnedAt ? row.returnedAt.toISOString() : null,
  };
}

/* ---------- Uso e disponibilidade (sem N+1) ---------- */

async function usedQuantityMap(tx: DbOrTx = db): Promise<Map<string, number>> {
  const [inProjects, activeLoans] = await Promise.all([
    tx
      .select({
        componentId: projectComponents.componentId,
        total: sql<number>`coalesce(sum(${projectComponents.quantity}), 0)::int`,
      })
      .from(projectComponents)
      .groupBy(projectComponents.componentId),
    tx
      .select({
        componentId: loans.componentId,
        total: sql<number>`coalesce(sum(${loans.quantity}), 0)::int`,
      })
      .from(loans)
      .where(isNull(loans.returnedAt))
      .groupBy(loans.componentId),
  ]);

  const map = new Map<string, number>();
  for (const row of inProjects) map.set(row.componentId, (map.get(row.componentId) ?? 0) + Number(row.total));
  for (const row of activeLoans) map.set(row.componentId, (map.get(row.componentId) ?? 0) + Number(row.total));
  return map;
}

/** Quantidade em uso de um componente: alocada em projetos + emprestada (empréstimos não devolvidos). */
export async function usedQuantity(componentId: string, tx: DbOrTx = db): Promise<number> {
  const [[proj], [loan]] = await Promise.all([
    tx
      .select({ total: sql<number>`coalesce(sum(${projectComponents.quantity}), 0)::int` })
      .from(projectComponents)
      .where(eq(projectComponents.componentId, componentId)),
    tx
      .select({ total: sql<number>`coalesce(sum(${loans.quantity}), 0)::int` })
      .from(loans)
      .where(and(eq(loans.componentId, componentId), isNull(loans.returnedAt))),
  ]);
  return Number(proj?.total ?? 0) + Number(loan?.total ?? 0);
}

/** Inventário completo com disponibilidade (todos veem tudo, independente de propriedade). */
export async function getInventory(): Promise<InventoryAvailability[]> {
  const [rows, usedMap] = await Promise.all([
    db.select().from(inventoryItems).orderBy(asc(inventoryItems.name)),
    usedQuantityMap(db),
  ]);
  return rows.map((row) => {
    const item = mapItem(row);
    const inUse = usedMap.get(item.id) ?? 0;
    return { ...item, inUse, available: Math.max(0, item.total - inUse) };
  });
}

export async function getInventoryItem(id: string): Promise<InventoryAvailability | null> {
  const [[row], inUse] = await Promise.all([
    db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1),
    usedQuantity(id, db),
  ]);
  if (!row) return null;
  const item = mapItem(row);
  return { ...item, inUse, available: Math.max(0, item.total - inUse) };
}

/** Onde cada unidade em uso está: projetos e empréstimos. */
export async function getInventoryUsage(componentId: string) {
  const [projectRows, loanRows] = await Promise.all([
    db
      .select({
        projectId: projects.id,
        eixo: projects.eixo,
        name: projects.name,
        quantity: projectComponents.quantity,
      })
      .from(projectComponents)
      .innerJoin(projects, eq(projectComponents.projectId, projects.id))
      .where(eq(projectComponents.componentId, componentId)),
    db
      .select()
      .from(loans)
      .where(and(eq(loans.componentId, componentId), isNull(loans.returnedAt))),
  ]);

  return {
    projects: projectRows.filter((p) => p.quantity > 0),
    loans: loanRows.map(mapLoan),
  };
}

/* ---------- Alterações (aplicação em transação) ---------- */

async function applyCreate(tx: DbOrTx, input: InventoryItemInput): Promise<ActionResult> {
  const id = newId("c");
  await tx.insert(inventoryItems).values({ id, ...input });
  return { ok: true, id };
}

async function applyUpdate(tx: DbOrTx, id: string, input: InventoryItemInput): Promise<ActionResult> {
  const [item] = await tx
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .limit(1);
  if (!item) return notFound("Item");
  const inUse = await usedQuantity(id, tx);
  if (input.total < inUse) {
    return {
      ok: false,
      error: `Há ${inUse} unidade(s) em uso; o total não pode ser menor.`,
      fieldErrors: { total: `Mínimo: ${inUse}.` },
    };
  }
  await tx
    .update(inventoryItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(inventoryItems.id, id));
  return { ok: true, id };
}

async function applyDelete(tx: DbOrTx, id: string): Promise<ActionResult> {
  const [item] = await tx
    .select({ id: inventoryItems.id })
    .from(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .limit(1);
  if (!item) return notFound("Item");
  const inUse = await usedQuantity(id, tx);
  if (inUse > 0) return { ok: false, error: `Não é possível excluir: ${inUse} unidade(s) em uso.` };
  await tx.delete(inventoryItems).where(eq(inventoryItems.id, id));
  return { ok: true };
}

/** Coordenação só atribui o item ao próprio eixo ou deixa sem propriedade. */
function canSetOwner(viewer: Member, ownerEixo: Eixo | null) {
  return canEditInventoryItem(viewer, { ownerEixo });
}

async function propose(
  tx: DbOrTx,
  viewer: Member,
  proposal: { action: "criar" | "editar" | "excluir"; itemId: string | null; data: InventoryItemInput | null },
): Promise<ActionResult> {
  const id = newId("ip");
  await tx.insert(inventoryProposals).values({
    id,
    proposerId: viewer.id,
    action: proposal.action,
    itemId: proposal.itemId,
    data: proposal.data,
    status: "pendente",
  });
  return { ok: true, id, pending: true };
}

/* ---------- Alterações (entrada) — aplica direto ou vira proposta ---------- */

export async function createInventoryItem(viewer: Member, input: InventoryItemInput): Promise<ActionResult> {
  if (canSetOwner(viewer, input.ownerEixo)) {
    return db.transaction((tx) => applyCreate(tx, input));
  }
  if (canProposeInventoryChange(viewer)) {
    return propose(db, viewer, { action: "criar", itemId: null, data: input });
  }
  return denied();
}

export async function updateInventoryItem(
  viewer: Member,
  id: string,
  input: InventoryItemInput,
): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    if (!item) return notFound("Item");
    if (canEditInventoryItem(viewer, item) && canSetOwner(viewer, input.ownerEixo)) {
      return applyUpdate(tx, id, input);
    }
    if (canProposeInventoryChange(viewer)) {
      const inUse = await usedQuantity(id, tx);
      if (input.total < inUse) {
        return {
          ok: false,
          error: `Há ${inUse} unidade(s) em uso; o total não pode ser menor.`,
          fieldErrors: { total: `Mínimo: ${inUse}.` },
        };
      }
      return propose(tx, viewer, { action: "editar", itemId: id, data: input });
    }
    return denied();
  });
}

export async function deleteInventoryItem(viewer: Member, id: string): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    if (!item) return notFound("Item");
    if (canEditInventoryItem(viewer, item)) return applyDelete(tx, id);
    if (canProposeInventoryChange(viewer)) return propose(tx, viewer, { action: "excluir", itemId: id, data: null });
    return denied();
  });
}

/* ---------- Propostas ---------- */

/** Eixo que decide a proposta: dono atual do item (ou o dono proposto, ao criar). */
export async function proposalOwner(
  p: Pick<InventoryProposal, "action" | "itemId" | "data">,
  tx: DbOrTx = db,
): Promise<Eixo | null> {
  if (p.action === "criar") return p.data?.ownerEixo ?? null;
  if (!p.itemId) return null;
  const [item] = await tx
    .select({ ownerEixo: inventoryItems.ownerEixo })
    .from(inventoryItems)
    .where(eq(inventoryItems.id, p.itemId))
    .limit(1);
  return item?.ownerEixo ?? null;
}

/** Propostas pendentes que aparecem no Painel da Coordenação do eixo (do eixo + sem propriedade). */
export async function getPanelProposals(viewer: Member, eixo: Eixo): Promise<InventoryProposal[]> {
  const rows = await db
    .select()
    .from(inventoryProposals)
    .where(eq(inventoryProposals.status, "pendente"))
    .orderBy(asc(inventoryProposals.createdAt));

  const referencedIds = rows.map((r) => r.itemId).filter((id): id is string => Boolean(id));
  const items =
    referencedIds.length > 0
      ? await db
          .select({ id: inventoryItems.id, ownerEixo: inventoryItems.ownerEixo })
          .from(inventoryItems)
          .where(inArray(inventoryItems.id, referencedIds))
      : [];
  const ownerByItem = new Map(items.map((i) => [i.id, i.ownerEixo]));

  return rows.map(mapProposal).filter((p) => {
    const owner =
      p.action === "criar" ? (p.data?.ownerEixo ?? null) : p.itemId ? (ownerByItem.get(p.itemId) ?? null) : null;
    return (owner === eixo || owner === null) && canApproveInventoryProposal(viewer, owner);
  });
}

export async function getMyProposals(viewer: Member): Promise<InventoryProposal[]> {
  const rows = await db
    .select()
    .from(inventoryProposals)
    .where(eq(inventoryProposals.proposerId, viewer.id))
    .orderBy(desc(inventoryProposals.createdAt));
  return rows.map(mapProposal);
}

export async function resolveProposal(
  viewer: Member,
  id: string,
  decision: "aplicada" | "recusada",
  note: string,
): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(inventoryProposals).where(eq(inventoryProposals.id, id)).limit(1);
    if (!row) return notFound("Proposta");
    if (row.status !== "pendente") return { ok: false, error: "Esta proposta já foi resolvida." };

    const owner = await proposalOwner({ action: row.action, itemId: row.itemId, data: row.data }, tx);
    if (!canApproveInventoryProposal(viewer, owner)) return denied();

    if (decision === "aplicada") {
      const result =
        row.action === "criar"
          ? await applyCreate(tx, row.data!)
          : row.action === "editar"
            ? await applyUpdate(tx, row.itemId!, row.data!)
            : await applyDelete(tx, row.itemId!);
      if (!result.ok) return result;
    }

    await tx
      .update(inventoryProposals)
      .set({
        status: decision,
        resolvedBy: viewer.id,
        resolutionNote: note,
        resolvedAt: new Date(),
      })
      .where(eq(inventoryProposals.id, id));

    return { ok: true };
  });
}

/* ---------- Uso por requisições (interno a lib/api) ---------- */

export async function addLoan(
  tx: DbOrTx,
  componentId: string,
  memberId: string,
  quantity: number,
  requestId: string | null,
) {
  await tx.insert(loans).values({
    id: newId("l"),
    componentId,
    memberId,
    quantity,
    requestId,
    returnedAt: null,
  });
}

export async function availableQuantity(componentId: string, tx: DbOrTx = db): Promise<number> {
  const [[item], inUse] = await Promise.all([
    tx.select({ total: inventoryItems.total }).from(inventoryItems).where(eq(inventoryItems.id, componentId)).limit(1),
    usedQuantity(componentId, tx),
  ]);
  return item ? item.total - inUse : 0;
}

/** Inclui (ou soma) um componente nos componentes do projeto. */
export async function allocateToProject(tx: DbOrTx, projectId: string, componentId: string, quantity: number) {
  const [project] = await tx.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return false;

  await tx
    .insert(projectComponents)
    .values({ projectId, componentId, quantity })
    .onConflictDoUpdate({
      target: [projectComponents.projectId, projectComponents.componentId],
      set: { quantity: sql`${projectComponents.quantity} + ${quantity}` },
    });
  return true;
}

/** Devolve ao inventário: tira do projeto (até a quantidade) ou encerra o empréstimo da requisição. */
export async function releaseFromRequest(
  tx: DbOrTx,
  requestId: string,
  projectId: string | null,
  componentId: string,
  quantity: number,
) {
  const [loan] = await tx
    .select({ id: loans.id })
    .from(loans)
    .where(and(eq(loans.requestId, requestId), isNull(loans.returnedAt)))
    .limit(1);

  if (loan) {
    await tx.update(loans).set({ returnedAt: new Date() }).where(eq(loans.id, loan.id));
    return;
  }

  if (!projectId) return;
  const [alloc] = await tx
    .select({ quantity: projectComponents.quantity })
    .from(projectComponents)
    .where(and(eq(projectComponents.projectId, projectId), eq(projectComponents.componentId, componentId)))
    .limit(1);

  if (!alloc) return;
  const remaining = alloc.quantity - Math.min(quantity, alloc.quantity);
  if (remaining <= 0) {
    await tx
      .delete(projectComponents)
      .where(and(eq(projectComponents.projectId, projectId), eq(projectComponents.componentId, componentId)));
  } else {
    await tx
      .update(projectComponents)
      .set({ quantity: remaining })
      .where(and(eq(projectComponents.projectId, projectId), eq(projectComponents.componentId, componentId)));
  }
}
