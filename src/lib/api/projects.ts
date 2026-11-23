import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { TASK_STATUS_LABEL } from "@/config/options";
import { type DbOrTx, db, newId } from "@/db";
import {
  inventoryItems,
  projectComponents,
  projectMembers,
  projects,
  resourceRequests,
  tasks,
  user,
} from "@/db/schema";
import type { ActionResult, Eixo, Member, Project, ProjectStatus, Task, TaskStatus } from "@/types";
import { canManageProjects, canRequestForProject, canUpdateTaskStatus, canViewEixo } from "../access";
import { allocateToProject, usedQuantity } from "./inventory";
import { eixoReviewerIds, notify } from "./notifications";
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

/* ---------- Hidratação em lote (sem N+1) ---------- */

async function hydrateProjects(rows: (typeof projects.$inferSelect)[], tx: DbOrTx = db): Promise<Project[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((p) => p.id);

  const [memberRows, taskRows, componentRows] = await Promise.all([
    tx.select().from(projectMembers).where(inArray(projectMembers.projectId, ids)),
    tx.select().from(tasks).where(inArray(tasks.projectId, ids)).orderBy(asc(tasks.deadline), asc(tasks.createdAt)),
    tx.select().from(projectComponents).where(inArray(projectComponents.projectId, ids)),
  ]);

  const membersByProject = new Map<string, string[]>();
  for (const m of memberRows) {
    const list = membersByProject.get(m.projectId) ?? [];
    list.push(m.memberId);
    membersByProject.set(m.projectId, list);
  }

  const tasksByProject = new Map<string, Task[]>();
  for (const t of taskRows) {
    const list = tasksByProject.get(t.projectId) ?? [];
    list.push({ id: t.id, title: t.title, assigneeId: t.assigneeId, deadline: t.deadline, status: t.status });
    tasksByProject.set(t.projectId, list);
  }

  const componentsByProject = new Map<string, { componentId: string; quantity: number }[]>();
  for (const c of componentRows) {
    const list = componentsByProject.get(c.projectId) ?? [];
    list.push({ componentId: c.componentId, quantity: c.quantity });
    componentsByProject.set(c.projectId, list);
  }

  return rows.map((p) => ({
    id: p.id,
    eixo: p.eixo,
    name: p.name,
    description: p.description,
    status: p.status,
    startDate: p.startDate,
    deadline: p.deadline,
    memberIds: membersByProject.get(p.id) ?? [],
    tasks: tasksByProject.get(p.id) ?? [],
    components: componentsByProject.get(p.id) ?? [],
  }));
}

/* ---------- Leitura ---------- */

export async function getEixoProjects(viewer: Member, eixo: Eixo): Promise<Project[] | null> {
  if (!canViewEixo(viewer, eixo)) return null;
  const rows = await db.select().from(projects).where(eq(projects.eixo, eixo)).orderBy(asc(projects.deadline));
  return hydrateProjects(rows);
}

/** Projeto do eixo informado. `project: null` = não existe nesse eixo; `allowed: false` = sem acesso (página chama forbidden()). */
export async function getProject(viewer: Member, eixo: Eixo, projectId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.eixo, eixo)))
    .limit(1);
  if (!row) return { project: null, allowed: true } as const;
  if (!canViewEixo(viewer, eixo)) return { project: null, allowed: false } as const;
  const [hydrated] = await hydrateProjects([row]);
  return { project: hydrated ?? null, allowed: true } as const;
}

/** Projetos que o membro pode vincular a uma requisição (afiliados; coordenador: todos do eixo). */
export async function getRequestableProjects(viewer: Member): Promise<Project[]> {
  if (!viewer.eixo) return [];
  const rows = await db.select().from(projects).where(eq(projects.eixo, viewer.eixo)).orderBy(asc(projects.name));
  const hydrated = await hydrateProjects(rows);
  return hydrated.filter((p) => canRequestForProject(viewer, p));
}

/** Projetos em que o membro está afiliado. */
export async function getMemberProjects(viewer: Member): Promise<Project[]> {
  const links = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.memberId, viewer.id));
  const projectIds = links.map((l) => l.projectId);
  if (projectIds.length === 0) return [];
  const rows = await db.select().from(projects).where(inArray(projects.id, projectIds)).orderBy(asc(projects.deadline));
  return hydrateProjects(rows);
}

/** Tarefas atribuídas ao membro, com o projeto de cada uma, ordenadas por prazo. */
export async function getAssignedTasks(viewer: Member): Promise<{ task: Task; project: Project }[]> {
  const myTasks = await db.select().from(tasks).where(eq(tasks.assigneeId, viewer.id)).orderBy(asc(tasks.deadline));
  if (myTasks.length === 0) return [];
  const projectIds = [...new Set(myTasks.map((t) => t.projectId))];
  const projectRows = await db.select().from(projects).where(inArray(projects.id, projectIds));
  const hydrated = await hydrateProjects(projectRows);
  const byId = new Map(hydrated.map((p) => [p.id, p]));

  return myTasks
    .map((t) => {
      const project = byId.get(t.projectId);
      if (!project) return null;
      const task: Task = {
        id: t.id,
        title: t.title,
        assigneeId: t.assigneeId,
        deadline: t.deadline,
        status: t.status,
      };
      return { task, project };
    })
    .filter((entry): entry is { task: Task; project: Project } => entry !== null);
}

/* ---------- Escrita (coordenação do eixo) ---------- */

async function validateMembers(tx: DbOrTx, eixo: Eixo, memberIds: string[]): Promise<ActionResult | null> {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length === 0) return null;
  const validRows = await tx
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, uniqueIds), eq(user.eixo, eixo)));
  if (validRows.length !== uniqueIds.length) {
    return {
      ok: false,
      error: "Só é possível afiliar membros do próprio eixo.",
      fieldErrors: { memberIds: "Membro inválido." },
    };
  }
  return null;
}

async function findManaged(
  tx: DbOrTx,
  viewer: Member,
  projectId: string,
): Promise<{ id: string; eixo: Eixo } | ActionResult> {
  const [project] = await tx
    .select({ id: projects.id, eixo: projects.eixo })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return notFound("Projeto");
  if (!canManageProjects(viewer, project.eixo)) return denied();
  return project;
}

const isResult = (x: { id: string; eixo: Eixo } | ActionResult): x is ActionResult => "ok" in x;

export async function createProject(viewer: Member, eixo: Eixo, input: ProjectInput): Promise<ActionResult> {
  if (!canManageProjects(viewer, eixo)) return denied();
  return db.transaction(async (tx) => {
    const invalid = await validateMembers(tx, eixo, input.memberIds);
    if (invalid) return invalid;

    const id = newId("p");
    await tx.insert(projects).values({
      id,
      eixo,
      name: input.name,
      description: input.description ?? "",
      status: input.status,
      startDate: input.startDate,
      deadline: input.deadline,
    });

    const uniqueMembers = [...new Set(input.memberIds)];
    if (uniqueMembers.length > 0) {
      await tx.insert(projectMembers).values(uniqueMembers.map((memberId) => ({ projectId: id, memberId })));
    }
    await notify(
      tx,
      uniqueMembers,
      {
        type: "projeto-adicionado",
        title: `Você entrou no projeto ${input.name}`,
        body: `Adicionado(a) por ${viewer.name}.`,
        href: `/eixos/${eixo}/projetos/${id}`,
      },
      viewer.id,
    );
    return { ok: true, id };
  });
}

export async function updateProject(viewer: Member, projectId: string, input: ProjectInput): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const project = await findManaged(tx, viewer, projectId);
    if (isResult(project)) return project;

    const invalid = await validateMembers(tx, project.eixo, input.memberIds);
    if (invalid) return invalid;

    await tx
      .update(projects)
      .set({
        name: input.name,
        description: input.description ?? "",
        status: input.status,
        startDate: input.startDate,
        deadline: input.deadline,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    const uniqueMembers = [...new Set(input.memberIds)];
    const previous = await tx
      .select({ memberId: projectMembers.memberId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    const previousIds = new Set(previous.map((p) => p.memberId));
    await tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    if (uniqueMembers.length > 0) {
      await tx.insert(projectMembers).values(uniqueMembers.map((memberId) => ({ projectId, memberId })));
      // Tarefas de quem saiu do projeto ficam sem responsável.
      await tx
        .update(tasks)
        .set({ assigneeId: null })
        .where(and(eq(tasks.projectId, projectId), notInArray(tasks.assigneeId, uniqueMembers)));
    } else {
      await tx.update(tasks).set({ assigneeId: null }).where(eq(tasks.projectId, projectId));
    }

    await notify(
      tx,
      uniqueMembers.filter((id) => !previousIds.has(id)),
      {
        type: "projeto-adicionado",
        title: `Você entrou no projeto ${input.name}`,
        body: `Adicionado(a) por ${viewer.name}.`,
        href: `/eixos/${project.eixo}/projetos/${projectId}`,
      },
      viewer.id,
    );
    return { ok: true, id: projectId };
  });
}

export async function deleteProject(viewer: Member, projectId: string): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const project = await findManaged(tx, viewer, projectId);
    if (isResult(project)) return project;

    await tx.update(resourceRequests).set({ projectId: null }).where(eq(resourceRequests.projectId, projectId));
    await tx.delete(projects).where(eq(projects.id, projectId));
    return { ok: true };
  });
}

export async function addTask(viewer: Member, projectId: string, input: TaskInput): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const project = await findManaged(tx, viewer, projectId);
    if (isResult(project)) return project;

    const assigneeId = input.assigneeId || null;
    if (assigneeId) {
      const [memberLink] = await tx
        .select({ memberId: projectMembers.memberId })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, assigneeId)))
        .limit(1);
      if (!memberLink) {
        return {
          ok: false,
          error: "O responsável precisa estar afiliado ao projeto.",
          fieldErrors: { assigneeId: "Escolha um membro do projeto." },
        };
      }
    }

    const id = newId("t");
    await tx.insert(tasks).values({
      id,
      projectId,
      title: input.title,
      assigneeId,
      deadline: input.deadline,
      status: "a-fazer",
    });
    await notify(
      tx,
      [assigneeId],
      {
        type: "tarefa-atribuida",
        title: `Nova tarefa: ${input.title}`,
        body: `Atribuída por ${viewer.name}.`,
        href: "/minha-area",
      },
      viewer.id,
    );
    return { ok: true, id };
  });
}

export async function deleteTask(viewer: Member, projectId: string, taskId: string): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const project = await findManaged(tx, viewer, projectId);
    if (isResult(project)) return project;
    await tx.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
    return { ok: true };
  });
}

/** Coordenação ou o responsável pela tarefa. */
export async function updateTaskStatus(
  viewer: Member,
  projectId: string,
  taskId: string,
  status: TaskStatus,
): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        taskId: tasks.id,
        title: tasks.title,
        status: tasks.status,
        assigneeId: tasks.assigneeId,
        eixo: projects.eixo,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)))
      .limit(1);

    if (!row) return notFound("Tarefa");
    if (!canUpdateTaskStatus(viewer, { eixo: row.eixo }, { assigneeId: row.assigneeId })) return denied();
    if (row.status === status) return { ok: true };

    await tx.update(tasks).set({ status }).where(eq(tasks.id, taskId));

    // Coordenação mudou a tarefa de alguém → avisa o responsável. Responsável concluiu → avisa a coordenação.
    const recipients =
      viewer.id !== row.assigneeId
        ? [row.assigneeId]
        : status === "concluida"
          ? await eixoReviewerIds(tx, row.eixo)
          : [];
    await notify(
      tx,
      recipients,
      {
        type: "tarefa-atualizada",
        title: `Tarefa ${TASK_STATUS_LABEL[status].toLowerCase()}: ${row.title}`,
        body: `Atualizada por ${viewer.name}.`,
        href: viewer.id !== row.assigneeId ? "/minha-area" : `/eixos/${row.eixo}/projetos/${projectId}`,
      },
      viewer.id,
    );
    return { ok: true };
  });
}

export async function allocateComponent(
  viewer: Member,
  projectId: string,
  componentId: string,
  quantity: number,
): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const project = await findManaged(tx, viewer, projectId);
    if (isResult(project)) return project;

    const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, componentId)).limit(1);
    if (!item) return notFound("Componente");

    const available = item.total - (await usedQuantity(componentId, tx));
    if (quantity > available) {
      return {
        ok: false,
        error: `Só há ${available} unidade(s) disponível(is) de ${item.name}.`,
        fieldErrors: { quantity: `Máximo: ${available}.` },
      };
    }

    await allocateToProject(tx, projectId, componentId, quantity);
    return { ok: true };
  });
}

export async function removeComponent(viewer: Member, projectId: string, componentId: string): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const project = await findManaged(tx, viewer, projectId);
    if (isResult(project)) return project;
    await tx
      .delete(projectComponents)
      .where(and(eq(projectComponents.projectId, projectId), eq(projectComponents.componentId, componentId)));
    return { ok: true };
  });
}
