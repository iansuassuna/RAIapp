"use server";

import { runAuthenticatedAction } from "@/lib/action-helpers";
import { getNotificationSummary, markAllNotificationsRead, markNotificationsRead } from "@/lib/api";
import { getSessionMember } from "@/lib/session";
import type { ActionResult, NotificationItem } from "@/types";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => markNotificationsRead(viewer, [String(id)]));
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return runAuthenticatedAction((viewer) => markAllNotificationsRead(viewer));
}

/** Fallback de polling quando o stream SSE não está disponível. */
export async function getNotificationSummaryAction(): Promise<{ unread: number; items: NotificationItem[] } | null> {
  const viewer = await getSessionMember();
  return viewer ? getNotificationSummary(viewer) : null;
}
