import type { InventoryAvailability } from "@/types";
import { getDb } from "../db";

/** Quantidade em uso de um componente: alocada em projetos + emprestada por requisições aprovadas sem projeto. */
export function usedQuantity(componentId: string) {
  const db = getDb();
  const inProjects = db.projects
    .flatMap((p) => p.components)
    .filter((c) => c.componentId === componentId)
    .reduce((sum, c) => sum + c.quantity, 0);
  const loans = db.requests
    .filter((r) => r.kind === "componente" && r.status === "aprovada" && !r.projectId && r.componentId === componentId)
    .reduce((sum, r) => sum + r.quantity, 0);
  return inProjects + loans;
}

/** Inventário de componentes do RAITec com a disponibilidade atual. */
export async function getInventory(): Promise<InventoryAvailability[]> {
  return getDb().inventory.map((item) => ({ ...item, available: Math.max(0, item.total - usedQuantity(item.id)) }));
}

export function componentName(id: string | null) {
  return getDb().inventory.find((i) => i.id === id)?.name ?? "Componente removido";
}
