import type { EvaluationRecord, InventoryItem, Member, Project, ResourceRequest } from "@/types";
import { mockEvaluations, mockInventory, mockMembers, mockProjects, mockRequests } from "./mock-data";

/**
 * "Banco" em memória — TEMPORÁRIO até existir backend.
 * Começa com os dados de `mock-data.ts` e guarda as alterações feitas pelas Server Actions
 * enquanto o servidor estiver rodando (reiniciar o servidor volta aos dados de exemplo).
 * Só `lib/api` deve ler/escrever aqui.
 */
export type Db = {
  members: Member[];
  projects: Project[];
  inventory: InventoryItem[];
  requests: ResourceRequest[];
  evaluations: EvaluationRecord[];
};

function seed(): Db {
  return structuredClone({
    members: mockMembers,
    projects: mockProjects,
    inventory: mockInventory,
    requests: mockRequests,
    evaluations: mockEvaluations,
  });
}

// Guardado no globalThis para sobreviver ao hot reload do `next dev`.
const store = globalThis as typeof globalThis & { __raiappDb?: Db };
store.__raiappDb ??= seed();

export function getDb(): Db {
  return store.__raiappDb!;
}

/** Volta aos dados de exemplo (usado nos testes). */
export function resetDb() {
  store.__raiappDb = seed();
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
