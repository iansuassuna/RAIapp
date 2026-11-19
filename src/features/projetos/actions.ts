"use server";

import { revalidatePath } from "next/cache";
import { isEixo } from "@/config/options";
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
import { getCurrentMember } from "@/lib/session";
import { invalidResult } from "@/lib/validation";
import type { ActionResult } from "@/types";
import { allocationSchema, projectSchema, taskSchema, taskStatusSchema } from "./schemas";

/**
 * Server Actions de projetos. Sempre revalidam a entrada e deixam a checagem
 * de permissão para `lib/api` (nunca confie no que vem do cliente).
 */

function done(result: ActionResult) {
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function createProjectAction(eixo: string, input: unknown): Promise<ActionResult> {
  if (!isEixo(eixo)) return { ok: false, error: "Eixo inválido." };
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await createProject(await getCurrentMember(), eixo, parsed.data));
}

export async function updateProjectAction(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await updateProject(await getCurrentMember(), projectId, parsed.data));
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  return done(await deleteProject(await getCurrentMember(), projectId));
}

export async function addTaskAction(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await addTask(await getCurrentMember(), projectId, parsed.data));
}

export async function deleteTaskAction(projectId: string, taskId: string): Promise<ActionResult> {
  return done(await deleteTask(await getCurrentMember(), projectId, taskId));
}

export async function updateTaskStatusAction(projectId: string, taskId: string, status: unknown): Promise<ActionResult> {
  const parsed = taskStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Status inválido." };
  return done(await updateTaskStatus(await getCurrentMember(), projectId, taskId, parsed.data));
}

export async function allocateComponentAction(projectId: string, input: unknown): Promise<ActionResult> {
  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success) return invalidResult(parsed.error);
  return done(await allocateComponent(await getCurrentMember(), projectId, parsed.data.componentId, parsed.data.quantity));
}

export async function removeComponentAction(projectId: string, componentId: string): Promise<ActionResult> {
  return done(await removeComponent(await getCurrentMember(), projectId, componentId));
}
