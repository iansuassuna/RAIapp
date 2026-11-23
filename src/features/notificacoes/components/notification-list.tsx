"use client";

import { BellOff, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { NotificationItem } from "@/types";
import { markAllNotificationsReadAction, markNotificationReadAction } from "../actions";
import { NotificationRow } from "./notification-row";

type Props = { items: NotificationItem[]; nextHref: string | null; hasUnread: boolean };

/** Histórico completo de notificações (paginado por cursor na URL). */
export function NotificationList({ items: initial, nextHref, hasUnread }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState(false);
  const anyUnread = hasUnread || items.some((i) => !i.read);

  async function open(item: NotificationItem) {
    if (!item.read) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      await markNotificationReadAction(item.id);
    }
    if (item.href) router.push(item.href);
    else router.refresh();
  }

  async function markAll() {
    setPending(true);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await markAllNotificationsReadAction();
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {anyUnread && (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={markAll} loading={pending}>
            <CheckCheck className="size-4" aria-hidden /> Marcar todas como lidas
          </Button>
        </div>
      )}
      <Card className="p-2">
        {items.length === 0 ? (
          <EmptyState icon={BellOff} title="Nenhuma notificação">
            Avisos sobre suas requisições, tarefas, pontos e avaliações aparecem aqui.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/70">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={cn(
                    "w-full rounded-xl px-3 py-3 transition hover:bg-surface-muted",
                    !item.read && "bg-accent-50/40",
                  )}
                >
                  <NotificationRow item={item} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {nextHref && (
        <div className="flex justify-center">
          <Link href={nextHref} className="text-sm font-semibold text-brand-700 hover:text-accent-600">
            Ver mais antigas
          </Link>
        </div>
      )}
    </div>
  );
}
