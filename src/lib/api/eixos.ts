import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { eixoGoals, eixoMetrics, projects, user } from "@/db/schema";
import type { Eixo, EixoOverview, Member } from "@/types";
import { canViewEixo } from "../access";
import { eixoEvaluationAverage } from "./evaluations";

/** Visão geral de um eixo, ou `null` se o membro não tem acesso a ele. */
export async function getEixoOverview(viewer: Member, eixo: Eixo): Promise<EixoOverview | null> {
  if (!canViewEixo(viewer, eixo)) return null;

  const [[metrics], goals, members, activeProjects, crossEvaluationAverage] = await Promise.all([
    db.select().from(eixoMetrics).where(eq(eixoMetrics.eixo, eixo)).limit(1),
    db
      .select({ id: eixoGoals.id, title: eixoGoals.title, deadline: eixoGoals.deadline, status: eixoGoals.status })
      .from(eixoGoals)
      .where(eq(eixoGoals.eixo, eixo))
      .orderBy(asc(eixoGoals.deadline)),
    db.select({ id: user.id, name: user.name, role: user.role }).from(user).where(eq(user.eixo, eixo)),
    db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.eixo, eixo), ne(projects.status, "concluido"))),
    eixoEvaluationAverage(eixo),
  ]);

  if (!metrics) return null;

  return {
    eixo,
    coordinator: members.find((m) => m.role === "coordenador")?.name ?? null,
    performance: { score: metrics.score, goal: metrics.goal },
    memberCount: members.length,
    activeProjects: activeProjects.length,
    activitiesCount: metrics.activitiesCount,
    crossEvaluationAverage,
    teams: [
      { time: "processos", score: metrics.processosScore },
      { time: "midias", score: metrics.midiasScore },
    ],
    goals,
  };
}
