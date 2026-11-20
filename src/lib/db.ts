import type { EvaluationRecord, InventoryItem, InventoryProposal, Loan, Member, Project, ResourceRequest } from "@/types";
import { mockEvaluations, mockInventory, mockLoans, mockMembers, mockProjects, mockProposals, mockRequests } from "./mock-data";

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
  loans: Loan[];
  proposals: InventoryProposal[];
  requests: ResourceRequest[];
  evaluations: EvaluationRecord[];
};

function seed(): Db {
  return structuredClone({
    members: mockMembers,
    projects: mockProjects,
    inventory: mockInventory,
    loans: mockLoans,
    proposals: mockProposals,
    requests: mockRequests,
    evaluations: mockEvaluations,
  });
}

// Guardado no globalThis para sobreviver ao hot reload do `next dev`.
// Mude a versão quando o formato do banco mudar, para não reaproveitar dados antigos em memória.
const KEY = "__raiappDb_v3";
const store = globalThis as typeof globalThis & { [KEY]?: Db };
store[KEY] ??= seed();

export function getDb(): Db {
  return store[KEY]!;
}

/** Volta aos dados de exemplo (usado nos testes). */
export function resetDb() {
  store[KEY] = seed();
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
