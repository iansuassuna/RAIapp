import { eq } from "drizzle-orm";
import { db, newId } from "@/db";
import { eixoGoals } from "@/db/schema";
import type { ActionResult, ActivityStatus, Eixo, Member } from "@/types";
import { canManageEixoGoals } from "../access";
import { denied, notFound } from "./shared";

export type GoalInput = { title: string; deadline: string; status: ActivityStatus };

export async function createEixoGoal(viewer: Member, eixo: Eixo, input: GoalInput): Promise<ActionResult> {
  if (!canManageEixoGoals(viewer, eixo)) return denied();
  const id = newId("g");
  await db.insert(eixoGoals).values({ id, eixo, ...input, title: input.title.trim(), createdBy: viewer.id });
  return { ok: true, id };
}

export async function updateEixoGoal(viewer: Member, goalId: string, input: GoalInput): Promise<ActionResult> {
  const [goal] = await db.select({ eixo: eixoGoals.eixo }).from(eixoGoals).where(eq(eixoGoals.id, goalId));
  if (!goal) return notFound("Meta");
  if (!canManageEixoGoals(viewer, goal.eixo)) return denied();
  await db
    .update(eixoGoals)
    .set({ ...input, title: input.title.trim(), updatedAt: new Date() })
    .where(eq(eixoGoals.id, goalId));
  return { ok: true, id: goalId };
}

export async function deleteEixoGoal(viewer: Member, goalId: string): Promise<ActionResult> {
  const [goal] = await db.select({ eixo: eixoGoals.eixo }).from(eixoGoals).where(eq(eixoGoals.id, goalId));
  if (!goal) return notFound("Meta");
  if (!canManageEixoGoals(viewer, goal.eixo)) return denied();
  await db.delete(eixoGoals).where(eq(eixoGoals.id, goalId));
  return { ok: true };
}
