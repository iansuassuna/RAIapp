import { EIXOS } from "@/config/options";
import type { Eixo, Member, Project, ResourceRequest, Task } from "@/types";

/**
 * Regras de acesso — fonte única da verdade.
 * Funções puras (sem Next/cookies) para serem usadas no servidor e testadas com `bun test`.
 *
 * - Diretoria (sem eixo): vê todos os eixos (somente leitura) e resolve as requisições dos coordenadores.
 * - Coordenador (sem time): gerencia o próprio eixo (projetos, requisições dos membros, avaliações
 *   detalhadas) e faz requisições à diretoria.
 * - Membro: vê o próprio eixo; atualiza as próprias tarefas e faz requisições à coordenação.
 */
type Viewer = Pick<Member, "eixo" | "role">;
type ViewerWithId = Pick<Member, "id" | "eixo" | "role">;

export function canViewEixo(viewer: Viewer, eixo: Eixo) {
  return viewer.role === "diretoria" || viewer.eixo === eixo;
}

export function getAccessibleEixos(viewer: Viewer): Eixo[] {
  return EIXOS.map((e) => e.value).filter((eixo) => canViewEixo(viewer, eixo));
}

/** Coordenador do eixo: gerencia projetos, resolve requisições e vê avaliações detalhadas. */
export function canManageEixo(viewer: Viewer, eixo: Eixo) {
  return viewer.role === "coordenador" && viewer.eixo === eixo;
}

export const canManageProjects = canManageEixo;

/** Fila de requisições dos membros de um eixo (aba Requisições do eixo). */
export const canReviewEixoRequests = canManageEixo;

/** Fila de requisições dos coordenadores (área da diretoria). */
export function canReviewDirectorRequests(viewer: Viewer) {
  return viewer.role === "diretoria";
}

/** Quem resolve uma requisição depende de quem a analisa. */
export function canResolveRequest(viewer: Viewer, request: Pick<ResourceRequest, "eixo" | "reviewer">) {
  return request.reviewer === "diretoria" ? canReviewDirectorRequests(viewer) : canReviewEixoRequests(viewer, request.eixo);
}

/** Para onde vai a requisição de quem pede. Diretoria não faz requisições. */
export function requestReviewerFor(viewer: Viewer) {
  if (viewer.role === "membro") return "coordenacao" as const;
  if (viewer.role === "coordenador") return "diretoria" as const;
  return null;
}

/** Coordenação do eixo do avaliado. A diretoria não tem eixo, então nenhuma coordenação vê as dela. */
export function canViewMemberEvaluations(viewer: Viewer, member: Pick<Member, "eixo">) {
  return member.eixo !== null && canManageEixo(viewer, member.eixo);
}

/** Coordenação do eixo altera qualquer tarefa; o responsável altera só o status da própria. */
export function canUpdateTaskStatus(viewer: ViewerWithId, project: Pick<Project, "eixo">, task: Pick<Task, "assigneeId">) {
  return canManageEixo(viewer, project.eixo) || task.assigneeId === viewer.id;
}

/** Membro vincula só projetos aos quais é afiliado; coordenador, qualquer projeto do próprio eixo. */
export function canRequestForProject(viewer: ViewerWithId, project: Pick<Project, "eixo" | "memberIds">) {
  if (viewer.role === "coordenador") return project.eixo === viewer.eixo;
  return viewer.role === "membro" && project.eixo === viewer.eixo && project.memberIds.includes(viewer.id);
}
