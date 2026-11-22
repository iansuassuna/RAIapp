"use server";

import { isEixo } from "@/config/options";
import { runAuthenticatedAction } from "@/lib/action-helpers";
import {
  addTask,
  allocateComponent,
  createProject,
  deleteProject,
  deleteTask,
  removeComponent,
  updateProject,
  updateTaskStatus,
} from "@/lib/api";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { allocationSchema, projectSchema, taskSchema, taskStatusSchema } from "./schemas";

/**
 * Server Actions de projetos. Sempre revalidam a entrada e deixam a checagem
 * de permissão para `lib/api` (nunca confie no que vem do cliente).
 */

export async function createProjectAction(eixo: string, input: unknown): Promise<ActionResult> {
  if (!isEixo(eixo)) return { ok: false, error: "Eixo inválido." };
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => createProject(viewer, eixo, parsed.data));
}

export async function updateProjectAction(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => updateProject(viewer, projectId, parsed.data));
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => deleteProject(viewer, projectId));
}

export async function addTaskAction(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) => addTask(viewer, projectId, parsed.data));
}

export async function deleteTaskAction(projectId: string, taskId: string): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => deleteTask(viewer, projectId, taskId));
}

export async function updateTaskStatusAction(
  projectId: string,
  taskId: string,
  status: unknown,
): Promise<ActionResult> {
  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  return runAuthenticatedAction((viewer) => updateTaskStatus(viewer, projectId, taskId, parsed.data));
}

export async function allocateComponentAction(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return runAuthenticatedAction((viewer) =>
    allocateComponent(viewer, projectId, parsed.data.componentId, parsed.data.quantity),
  );
}

export async function removeComponentAction(projectId: string, componentId: string): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => removeComponent(viewer, projectId, componentId));
}
