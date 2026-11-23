import { EIXOS } from "@/config/options";
import type { Eixo, InventoryItem, Member, Project, ResourceRequest, Task } from "@/types";

/**
 * Regras de acesso — fonte única da verdade.
 * Funções puras (sem Next/cookies) para serem usadas no servidor e testadas com `bun test`.
 *
 * - Diretoria (sem eixo): vê todos os eixos; age no Painel da Coordenação de qualquer eixo; resolve
 *   as requisições dos coordenadores; edita qualquer item do inventário. Não gerencia projetos.
 * - Coordenador (sem time): gerencia o próprio eixo (projetos, Painel da Coordenação, avaliações
 *   detalhadas); edita itens do inventário do próprio eixo e os sem propriedade; pede à diretoria.
 * - Membro: vê o próprio eixo e todo o inventário; atualiza as próprias tarefas e faz requisições.
 *   Quem é do time Processos propõe alterações no inventário (aplicadas só depois de aprovadas).
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

/** Painel da Coordenação de um eixo: coordenação do eixo ou diretoria (que age em todos). */
export function canUseCoordinationPanel(viewer: Viewer, eixo: Eixo) {
  return viewer.role === "diretoria" || canManageEixo(viewer, eixo);
}

/** Fila de requisições dos membros de um eixo (no Painel da Coordenação). */
export const canReviewEixoRequests = canUseCoordinationPanel;

/** Fila de requisições dos coordenadores (área da diretoria). */
export function canReviewDirectorRequests(viewer: Viewer) {
  return viewer.role === "diretoria";
}

/**
 * Conta criada pelo cadastro novo (`verificationRequired`) que ainda não confirmou o e-mail:
 * tem sessão, mas não acessa o app. Contas antigas (`verificationRequired = false`) não são afetadas.
 */
export function isPendingEmailVerification(user: { verificationRequired?: boolean | null; emailVerified: boolean }) {
  return Boolean(user.verificationRequired) && !user.emailVerified;
}

/** "Minha área" (projetos afiliados, tarefas e requisições): membros e coordenação. A diretoria usa `/diretoria`. */
export function hasMemberArea(viewer: Viewer) {
  return viewer.role !== "diretoria";
}

/** Gestão de papéis e vínculos de membros (exclusiva da diretoria). */
export function canManageMemberRoles(viewer: Viewer) {
  return viewer.role === "diretoria";
}

/** Quem resolve uma requisição depende de quem a analisa. */
export function canResolveRequest(viewer: Viewer, request: Pick<ResourceRequest, "eixo" | "reviewer">) {
  return request.reviewer === "diretoria"
    ? canReviewDirectorRequests(viewer)
    : canReviewEixoRequests(viewer, request.eixo);
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
export function canUpdateTaskStatus(
  viewer: ViewerWithId,
  project: Pick<Project, "eixo">,
  task: Pick<Task, "assigneeId">,
) {
  return canManageEixo(viewer, project.eixo) || task.assigneeId === viewer.id;
}

/** Membro vincula só projetos aos quais é afiliado; coordenador, qualquer projeto do próprio eixo. */
export function canRequestForProject(viewer: ViewerWithId, project: Pick<Project, "eixo" | "memberIds">) {
  if (viewer.role === "coordenador") return project.eixo === viewer.eixo;
  return viewer.role === "membro" && project.eixo === viewer.eixo && project.memberIds.includes(viewer.id);
}

/* ---------- Inventário ---------- */

/** Todo mundo vê o inventário inteiro, independente de propriedade. */
export function canViewInventory(_viewer: Viewer) {
  return true;
}

/** Edita direto: diretoria em qualquer item; coordenação nos do próprio eixo e nos sem propriedade. */
export function canEditInventoryItem(viewer: Viewer, item: Pick<InventoryItem, "ownerEixo">) {
  if (viewer.role === "diretoria") return true;
  return viewer.role === "coordenador" && (item.ownerEixo === null || item.ownerEixo === viewer.eixo);
}

/** Membro do time Processos: propõe alterações, que só valem depois de aprovadas. */
export function canProposeInventoryChange(viewer: Pick<Member, "role" | "time">) {
  return viewer.role === "membro" && viewer.time === "processos";
}

/**
 * Quem aprova uma proposta: a coordenação do eixo dono do item (ou, sem dono, qualquer coordenação);
 * a diretoria aprova qualquer uma. `ownerEixo` = dono atual do item (ou o proposto, ao criar).
 */
export function canApproveInventoryProposal(viewer: Viewer, ownerEixo: Eixo | null) {
  if (viewer.role === "diretoria") return true;
  return viewer.role === "coordenador" && (ownerEixo === null || ownerEixo === viewer.eixo);
}

/**
 * Eixos que a pessoa pode escolher como dono de um item (null = sem propriedade).
 * Time Processos escolhe qualquer um (vira proposta para o dono aprovar).
 */
export function assignableOwners(viewer: Pick<Member, "role" | "eixo" | "time">): (Eixo | null)[] {
  const all: (Eixo | null)[] = [null, ...EIXOS.map((e) => e.value)];
  if (canProposeInventoryChange(viewer) && viewer.role === "membro") return all;
  return all.filter((owner) => canEditInventoryItem(viewer, { ownerEixo: owner }));
}

/* ---------- Pontuação, atividades, metas e ciclos (Fase 2) ---------- */

type ScoredMember = Pick<Member, "id" | "role" | "eixo">;

/**
 * Registrar atividades e ajustar pontos de um membro: coordenação do eixo (só para membros do eixo)
 * e diretoria (qualquer pessoa, inclusive coordenadores). Ninguém lança pontos para si mesmo.
 */
export function canManageMemberScore(viewer: ViewerWithId, member: ScoredMember) {
  if (viewer.id === member.id) return false;
  if (viewer.role === "diretoria") return true;
  return viewer.role === "coordenador" && member.role === "membro" && member.eixo === viewer.eixo;
}

/** Ver atividades e histórico de pontos: o próprio membro ou quem pode gerenciá-los. */
export function canViewMemberScore(viewer: ViewerWithId, member: ScoredMember) {
  return viewer.id === member.id || canManageMemberScore(viewer, member);
}

/** Metas do eixo (CRUD no Painel da Coordenação): coordenação do próprio eixo. */
export function canManageEixoGoals(viewer: Viewer, eixo: Eixo) {
  return canManageEixo(viewer, eixo);
}

/** Ciclos de avaliação: só a diretoria, e só ciclos que ainda não começaram (`today` em AAAA-MM-DD). */
export function canEditEvaluationCycle(viewer: Viewer, cycle: { startsOn: string }, today: string) {
  return viewer.role === "diretoria" && cycle.startsOn > today;
}

export function canViewEvaluationCycles(viewer: Viewer) {
  return viewer.role === "diretoria";
}
