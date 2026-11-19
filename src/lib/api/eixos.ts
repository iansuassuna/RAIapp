import type { Eixo, EixoOverview, Member } from "@/types";
import { canViewEixo } from "../access";
import { getDb } from "../db";
import { mockEixos } from "../mock-data";
import { eixoEvaluationAverage } from "./evaluations";

/** Visão geral de um eixo, ou `null` se o membro não tem acesso a ele. */
export async function getEixoOverview(viewer: Member, eixo: Eixo): Promise<EixoOverview | null> {
  if (!canViewEixo(viewer, eixo)) return null;
  const base = mockEixos.find((e) => e.eixo === eixo);
  if (!base) return null;
  const db = getDb();
  const members = db.members.filter((m) => m.eixo === eixo);
  return {
    ...base,
    coordinator: members.find((m) => m.role === "coordenador")?.name ?? null,
    memberCount: members.length,
    activeProjects: db.projects.filter((p) => p.eixo === eixo && p.status !== "concluido").length,
    crossEvaluationAverage: eixoEvaluationAverage(eixo),
  };
}
