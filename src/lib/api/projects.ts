import type { ActionResult, Eixo, Member, Project, ProjectStatus, Task, TaskStatus } from "@/types";
import { canManageProjects, canRequestForProject, canUpdateTaskStatus, canViewEixo } from "../access";
import { getDb, newId } from "../db";
import { usedQuantity } from "./inventory";
import { denied, notFound } from "./shared";

export type ProjectInput = {
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate: string;
  deadline: string;
  memberIds: string[];
};

export type TaskInput = { title: string; assigneeId?: string; deadline: string };

export function projectProgress(project: Pick<Project, "tasks">) {
  const done = project.tasks.filter((t) => t.status === "concluida").length;
  return { done, total: project.tasks.length };
}

/* ---------- Leitura ---------- */

export async function getEixoProjects(viewer: Member, eixo: Eixo): Promise<Project[] | null> {
  if (!canViewEixo(viewer, eixo)) return null;
  return getDb()
    .projects.filter((p) => p.eixo === eixo)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

/** Projeto do eixo informado. `project: null` = não existe nesse eixo; `allowed: false` = sem acesso (página chama forbidden()). */
export async function getProject(viewer: Member, eixo: Eixo, projectId: string) {
  const project = getDb().projects.find((p) => p.id === projectId && p.eixo === eixo);
  if (!project) return { project: null, allowed: true } as const;
  return { project, allowed: canViewEixo(viewer, eixo) } as const;
}

/** Projetos que o membro pode vincular a uma requisição (afiliados; coordenador: todos do eixo). */
export async function getRequestableProjects(viewer: Member) {
  return getDb()
    .projects.filter((p) => canRequestForProject(viewer, p))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Projetos em que o membro está afiliado. */
export async function getMemberProjects(viewer: Member) {
  return getDb()
    .projects.filter((p) => p.memberIds.includes(viewer.id))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

/** Tarefas atribuídas ao membro, com o projeto de cada uma, ordenadas por prazo. */
export async function getAssignedTasks(viewer: Member) {
  return getDb()
    .projects.flatMap((project) => project.tasks.filter((t) => t.assigneeId === viewer.id).map((task) => ({ task, project })))
    .sort((a, b) => a.task.deadline.localeCompare(b.task.deadline));
}

/* ---------- Escrita (coordenação do eixo) ---------- */

function validateMembers(eixo: Eixo, memberIds: string[]): ActionResult | null {
  const db = getDb();
  const invalid = memberIds.filter((id) => !db.members.some((m) => m.id === id && m.eixo === eixo));
  return invalid.length ? { ok: false, error: "Só é possível afiliar membros do próprio eixo.", fieldErrors: { memberIds: "Membro inválido." } } : null;
}

export async function createProject(viewer: Member, eixo: Eixo, input: ProjectInput): Promise<ActionResult> {
  if (!canManageProjects(viewer, eixo)) return denied();
  const invalid = validateMembers(eixo, input.memberIds);
  if (invalid) return invalid;
  const project: Project = {
    id: newId("p"),
    eixo,
    name: input.name,
    description: input.description ?? "",
    status: input.status,
    startDate: input.startDate,
    deadline: input.deadline,
    memberIds: input.memberIds,
    tasks: [],
    components: [],
  };
  getDb().projects.push(project);
  return { ok: true, id: project.id };
}

function findManaged(viewer: Member, projectId: string): Project | ActionResult {
  const project = getDb().projects.find((p) => p.id === projectId);
  if (!project) return notFound("Projeto");
  if (!canManageProjects(viewer, project.eixo)) return denied();
  return project;
}
const isResult = (x: Project | ActionResult): x is ActionResult => "ok" in x;

export async function updateProject(viewer: Member, projectId: string, input: ProjectInput): Promise<ActionResult> {
  const project = findManaged(viewer, projectId);
  if (isResult(project)) return project;
  const invalid = validateMembers(project.eixo, input.memberIds);
  if (invalid) return invalid;
  Object.assign(project, { ...input, description: input.description ?? "" });
  // Tarefas de quem saiu do projeto ficam sem responsável.
  for (const t of project.tasks) if (t.assigneeId && !project.memberIds.includes(t.assigneeId)) t.assigneeId = null;
  return { ok: true, id: project.id };
}

export async function deleteProject(viewer: Member, projectId: string): Promise<ActionResult> {
  const project = findManaged(viewer, projectId);
  if (isResult(project)) return project;
  const db = getDb();
  db.projects = db.projects.filter((p) => p.id !== projectId);
  // Requisições pendentes do projeto deixam de apontar para ele.
  for (const r of db.requests) if (r.projectId === projectId) r.projectId = null;
  return { ok: true };
}

export async function addTask(viewer: Member, projectId: string, input: TaskInput): Promise<ActionResult> {
  const project = findManaged(viewer, projectId);
  if (isResult(project)) return project;
  const assigneeId = input.assigneeId || null;
  if (assigneeId && !project.memberIds.includes(assigneeId)) {
    return { ok: false, error: "O responsável precisa estar afiliado ao projeto.", fieldErrors: { assigneeId: "Escolha um membro do projeto." } };
  }
  const task: Task = { id: newId("t"), title: input.title, assigneeId, deadline: input.deadline, status: "a-fazer" };
  project.tasks.push(task);
  return { ok: true, id: task.id };
}

export async function deleteTask(viewer: Member, projectId: string, taskId: string): Promise<ActionResult> {
  const project = findManaged(viewer, projectId);
  if (isResult(project)) return project;
  project.tasks = project.tasks.filter((t) => t.id !== taskId);
  return { ok: true };
}

/** Coordenação ou o responsável pela tarefa. */
export async function updateTaskStatus(viewer: Member, projectId: string, taskId: string, status: TaskStatus): Promise<ActionResult> {
  const project = getDb().projects.find((p) => p.id === projectId);
  const task = project?.tasks.find((t) => t.id === taskId);
  if (!project || !task) return notFound("Tarefa");
  if (!canUpdateTaskStatus(viewer, project, task)) return denied();
  task.status = status;
  return { ok: true };
}

export async function allocateComponent(viewer: Member, projectId: string, componentId: string, quantity: number): Promise<ActionResult> {
  const project = findManaged(viewer, projectId);
  if (isResult(project)) return project;
  const item = getDb().inventory.find((i) => i.id === componentId);
  if (!item) return notFound("Componente");
  const available = item.total - usedQuantity(componentId);
  if (quantity > available) {
    return { ok: false, error: `Só há ${available} unidade(s) disponível(is) de ${item.name}.`, fieldErrors: { quantity: `Máximo: ${available}.` } };
  }
  const existing = project.components.find((c) => c.componentId === componentId);
  if (existing) existing.quantity += quantity;
  else project.components.push({ componentId, quantity });
  return { ok: true };
}

export async function removeComponent(viewer: Member, projectId: string, componentId: string): Promise<ActionResult> {
  const project = findManaged(viewer, projectId);
  if (isResult(project)) return project;
  project.components = project.components.filter((c) => c.componentId !== componentId);
  return { ok: true };
}
