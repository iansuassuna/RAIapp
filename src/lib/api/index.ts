/**
 * Camada de acesso a dados. Hoje lê/escreve no banco em memória (`lib/db.ts`);
 * depois troque o corpo das funções por chamadas à API real sem mexer nas páginas.
 * Funções que dependem de permissão recebem o membro e aplicam `lib/access.ts` aqui,
 * para que dados de outro eixo nunca cheguem à página.
 */
import { describeMember } from "@/config/options";
import { getDb } from "../db";
import { mockActivities, mockPerformance, mockTrajectory } from "../mock-data";

export async function getDashboard() {
  return { performance: mockPerformance, trajectory: mockTrajectory, activities: mockActivities };
}

export * from "./eixos";
export * from "./evaluations";
export * from "./inventory";
export * from "./members";
export * from "./projects";
export * from "./requests";

/** Mapas id → nome para exibir listas sem buscar item por item. */
export async function getLookups() {
  const db = getDb();
  return {
    memberNames: Object.fromEntries(db.members.map((m) => [m.id, m.name])),
    /** "Coordenação · Inovação", "Mídias · Inovação"… */
    memberContexts: Object.fromEntries(db.members.map((m) => [m.id, describeMember(m)])),
    componentNames: Object.fromEntries(db.inventory.map((i) => [i.id, i.name])),
    projectNames: Object.fromEntries(db.projects.map((p) => [p.id, p.name])),
  };
}
