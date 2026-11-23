import { and, asc, count, eq, ne } from "drizzle-orm";
import { SCORE_GOAL } from "@/config/options";
import { db } from "@/db";
import { activities, eixoGoals, projects, user } from "@/db/schema";
import type { Eixo, EixoOverview, Member, Time } from "@/types";
import { canViewEixo } from "../access";
import { eixoEvaluationAverage } from "./evaluations";

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;

/**
 * Visão geral de um eixo, ou `null` se o membro não tem acesso a ele.
 * Métricas derivadas dos dados reais: pontuação do eixo = média dos membros (sem a coordenação),
 * pontuação por time = média dos membros do time, atividades = registradas para membros do eixo.
 */
export async function getEixoOverview(viewer: Member, eixo: Eixo): Promise<EixoOverview | null> {
  if (!canViewEixo(viewer, eixo)) return null;

  const [goals, members, activeProjects, [activityCount], crossEvaluationAverage] = await Promise.all([
    db
      .select({ id: eixoGoals.id, title: eixoGoals.title, deadline: eixoGoals.deadline, status: eixoGoals.status })
      .from(eixoGoals)
      .where(eq(eixoGoals.eixo, eixo))
      .orderBy(asc(eixoGoals.deadline)),
    db
      .select({ id: user.id, name: user.name, role: user.role, time: user.time, score: user.score })
      .from(user)
      .where(eq(user.eixo, eixo)),
    db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.eixo, eixo), ne(projects.status, "concluido"))),
    db
      .select({ total: count() })
      .from(activities)
      .innerJoin(user, eq(activities.memberId, user.id))
      .where(eq(user.eixo, eixo)),
    eixoEvaluationAverage(eixo),
  ]);

  const regular = members.filter((m) => m.role === "membro");
  const teamScore = (time: Time) => average(regular.filter((m) => m.time === time).map((m) => m.score));

  return {
    eixo,
    coordinator: members.find((m) => m.role === "coordenador")?.name ?? null,
    performance: { score: average(regular.map((m) => m.score)), goal: SCORE_GOAL },
    memberCount: members.length,
    activeProjects: activeProjects.length,
    activitiesCount: activityCount?.total ?? 0,
    crossEvaluationAverage,
    teams: [
      { time: "processos", score: teamScore("processos") },
      { time: "midias", score: teamScore("midias") },
    ],
    goals,
  };
}

/** Metas de um eixo (Painel da Coordenação). Null = sem acesso. */
export async function getEixoGoals(viewer: Member, eixo: Eixo) {
  if (!canViewEixo(viewer, eixo)) return null;
  return db
    .select({
      id: eixoGoals.id,
      eixo: eixoGoals.eixo,
      title: eixoGoals.title,
      deadline: eixoGoals.deadline,
      status: eixoGoals.status,
    })
    .from(eixoGoals)
    .where(eq(eixoGoals.eixo, eixo))
    .orderBy(asc(eixoGoals.deadline));
}
