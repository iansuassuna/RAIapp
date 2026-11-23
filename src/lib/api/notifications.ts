import { and, count, desc, eq, inArray, isNull, lt, or, type SQL, sql } from "drizzle-orm";
import { type DbOrTx, db, newId } from "@/db";
import { notifications, user } from "@/db/schema";
import type { ActionResult, Eixo, Member, NotificationItem, NotificationType } from "@/types";
import { notFound } from "./shared";

/** Canal do Postgres usado para avisar o stream SSE (`/api/notifications/stream`) depois do commit. */
export const NOTIFICATIONS_CHANNEL = "raiapp_notifications";

export type NotificationPayload = { type: NotificationType; title: string; body?: string; href?: string | null };

/**
 * Cria notificações DENTRO da transação do evento que as gera. O `pg_notify` também é transacional:
 * só é entregue se o commit acontecer, então ninguém é avisado de algo que foi desfeito.
 * Quem executou a ação (`actorId`) nunca é notificado.
 */
export async function notify(
  tx: DbOrTx,
  recipientIds: (string | null | undefined)[],
  payload: NotificationPayload,
  actorId?: string | null,
) {
  const recipients = [...new Set(recipientIds.filter((id): id is string => Boolean(id) && id !== actorId))];
  if (recipients.length === 0) return;

  const rows = recipients.map((recipientId) => ({
    id: newId("n"),
    recipientId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? "",
    href: payload.href ?? null,
  }));
  await tx.insert(notifications).values(rows);
  for (const row of rows) {
    await tx.execute(sql`select pg_notify(${NOTIFICATIONS_CHANNEL}, ${encodeSignal(row.recipientId, row.id)})`);
  }
}

/** Sinal do canal: "destinatário:notificação" (só ids; o conteúdo é lido do banco por quem recebe). */
export function encodeSignal(recipientId: string, notificationId: string) {
  return `${recipientId}:${notificationId}`;
}

export function decodeSignal(payload: string): { recipientId: string; notificationId: string } | null {
  const sep = payload.lastIndexOf(":");
  if (sep <= 0) return null;
  return { recipientId: payload.slice(0, sep), notificationId: payload.slice(sep + 1) };
}

/* ---------- Destinatários ---------- */

/** Coordenação do eixo; se o eixo estiver sem coordenador, a diretoria (alguém precisa ser avisado). */
export async function eixoReviewerIds(tx: DbOrTx, eixo: Eixo): Promise<string[]> {
  const coordinators = await tx
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.role, "coordenador"), eq(user.eixo, eixo)));
  return coordinators.length > 0 ? coordinators.map((c) => c.id) : directorIds(tx);
}

export async function directorIds(tx: DbOrTx): Promise<string[]> {
  const rows = await tx.select({ id: user.id }).from(user).where(eq(user.role, "diretoria"));
  return rows.map((r) => r.id);
}

export async function allUserIds(tx: DbOrTx): Promise<string[]> {
  const rows = await tx.select({ id: user.id }).from(user);
  return rows.map((r) => r.id);
}

/* ---------- Leitura ---------- */

const itemColumns = {
  id: notifications.id,
  type: notifications.type,
  title: notifications.title,
  body: notifications.body,
  href: notifications.href,
  readAt: notifications.readAt,
  createdAt: notifications.createdAt,
};

function toItem(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function countUnreadNotifications(recipientId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt)));
  return row?.total ?? 0;
}

/** Resumo para o sino do header: não lidas + as mais recentes. Sempre do próprio membro. */
export async function getNotificationSummary(
  viewer: Member,
  limit = 8,
): Promise<{ unread: number; items: NotificationItem[] }> {
  const [unread, rows] = await Promise.all([
    countUnreadNotifications(viewer.id),
    db
      .select(itemColumns)
      .from(notifications)
      .where(eq(notifications.recipientId, viewer.id))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit),
  ]);
  return { unread, items: rows.map(toItem) };
}

/** Uma notificação do próprio membro (para o push do stream). */
export async function getNotificationFor(recipientId: string, id: string): Promise<NotificationItem | null> {
  const [row] = await db
    .select(itemColumns)
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, recipientId)));
  return row ? toItem(row) : null;
}

export type NotificationPage = { items: NotificationItem[]; nextCursor: string | null };

/**
 * Histórico paginado por cursor (`createdAt|id` da última linha da página anterior), mais recentes primeiro.
 */
export async function listNotifications(
  viewer: Member,
  cursor?: string | null,
  pageSize = 20,
): Promise<NotificationPage> {
  let after: SQL | undefined;
  if (cursor) {
    const [at, id] = cursor.split("|");
    const date = at ? new Date(at) : null;
    if (date && !Number.isNaN(date.getTime()) && id) {
      after = or(lt(notifications.createdAt, date), and(eq(notifications.createdAt, date), lt(notifications.id, id)));
    }
  }
  const rows = await db
    .select(itemColumns)
    .from(notifications)
    .where(and(eq(notifications.recipientId, viewer.id), after))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(pageSize + 1);

  const page = rows.slice(0, pageSize);
  const last = page.at(-1);
  return {
    items: page.map(toItem),
    nextCursor: rows.length > pageSize && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
  };
}

/* ---------- Escrita (sempre só nas do próprio membro) ---------- */

export async function markNotificationsRead(viewer: Member, ids: string[]): Promise<ActionResult> {
  const unique = [...new Set(ids)].slice(0, 100);
  if (unique.length === 0) return { ok: true };
  const updated = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.recipientId, viewer.id), inArray(notifications.id, unique), isNull(notifications.readAt)),
    )
    .returning({ id: notifications.id });
  if (updated.length === 0) {
    // Já lidas ou de outra pessoa: só confirma que existem para o próprio membro.
    const [own] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.recipientId, viewer.id), inArray(notifications.id, unique)))
      .limit(1);
    if (!own) return notFound("Notificação");
  }
  return { ok: true };
}

export async function markAllNotificationsRead(viewer: Member): Promise<ActionResult> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, viewer.id), isNull(notifications.readAt)));
  return { ok: true };
}
