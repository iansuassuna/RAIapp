/**
 * Camada de acesso a dados (PostgreSQL via Drizzle ORM).
 * Funções que dependem de permissão recebem o membro e aplicam `lib/access.ts` aqui,
 * para que dados de outro eixo nunca cheguem à página.
 */
import { desc, eq, isNull, or } from "drizzle-orm";
import { describeMember } from "@/config/options";
import { db } from "@/db";
import { activities, inventoryItems, projects, user } from "@/db/schema";
import type { Activity, Member, Performance, Trajectory } from "@/types";
import { toMember } from "./shared";

export async function getDashboard(viewer: Member): Promise<{
  performance: Performance;
  trajectory: Trajectory;
  activities: Activity[];
}> {
  const [[userRow], activityRows] = await Promise.all([
    db.select({ score: user.score }).from(user).where(eq(user.id, viewer.id)).limit(1),
    db
      .select({
        id: activities.id,
        title: activities.title,
        type: activities.type,
        date: activities.date,
        status: activities.status,
      })
      .from(activities)
      .where(or(isNull(activities.memberId), eq(activities.memberId, viewer.id)))
      .orderBy(desc(activities.date)),
  ]);

  const capacitacoes = activityRows.filter((a) => a.type === "capacitacao").length;
  const cursos = activityRows.filter((a) => a.type === "curso").length;
  const visitas = activityRows.filter((a) => a.type === "visita").length;

  return {
    performance: { score: userRow?.score ?? 0, goal: 100 },
    trajectory: {
      capacitacoes,
      cursos,
      visitas,
      atividades: activityRows.length,
    },
    activities: activityRows,
  };
}

export * from "./eixos";
export * from "./evaluations";
export * from "./inventory";
export * from "./members";
export * from "./profile";
export * from "./projects";
export * from "./requests";

/** Mapas id → nome para exibir listas sem buscar item por item. */
export async function getLookups() {
  const [memberRows, inventoryRows, projectRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        eixo: user.eixo,
        time: user.time,
      })
      .from(user),
    db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        cabinet: inventoryItems.cabinet,
        ownerEixo: inventoryItems.ownerEixo,
      })
      .from(inventoryItems),
    db.select({ id: projects.id, name: projects.name }).from(projects),
  ]);

  const members = memberRows.map(toMember).filter((m): m is Member => m !== null);

  return {
    memberNames: Object.fromEntries(members.map((m) => [m.id, m.name])),
    /** "Coordenação · Inovação", "Mídias · Inovação"… */
    memberContexts: Object.fromEntries(members.map((m) => [m.id, describeMember(m)])),
    componentNames: Object.fromEntries(inventoryRows.map((i) => [i.id, i.name])),
    components: Object.fromEntries(
      inventoryRows.map((i) => [i.id, { name: i.name, cabinet: i.cabinet, ownerEixo: i.ownerEixo }]),
    ),
    projectNames: Object.fromEntries(projectRows.map((p) => [p.id, p.name])),
  };
}
