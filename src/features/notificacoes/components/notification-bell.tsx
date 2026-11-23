"use client";

import { Bell, BellOff, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { NotificationItem } from "@/types";
import { getNotificationSummaryAction, markAllNotificationsReadAction, markNotificationReadAction } from "../actions";
import { NotificationRow } from "./notification-row";

const MAX_ITEMS = 8;
const POLL_MS = 30_000;

type Props = { initialUnread: number; initialItems: NotificationItem[] };

/**
 * Sino do header: contador de não lidas, menu com as mais recentes e atualização em tempo real via SSE
 * (`/api/notifications/stream`). Se o stream cair de vez, passa a consultar a cada 30 s.
 */
export function NotificationBell({ initialUnread, initialItems }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(initialItems);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // O layout re-renderiza no servidor após ações (ex.: "marcar todas" em /notificacoes): adota o resumo novo.
  useEffect(() => {
    setUnread(initialUnread);
    setItems(initialItems);
  }, [initialUnread, initialItems]);

  const refresh = useCallback(async () => {
    const summary = await getNotificationSummaryAction();
    if (summary) {
      setUnread(summary.unread);
      setItems(summary.items);
    }
  }, []);

  // Tempo real: SSE; polling só como plano B.
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      poll ??= setInterval(refresh, POLL_MS);
    };

    if (typeof EventSource === "undefined") {
      startPolling();
      return () => {
        if (poll) clearInterval(poll);
      };
    }

    const source = new EventSource("/api/notifications/stream");
    source.addEventListener("ready", (event) => {
      const data = JSON.parse((event as MessageEvent<string>).data) as { unread: number };
      setUnread(data.unread);
      if (poll) {
        clearInterval(poll);
        poll = null;
      }
    });
    source.addEventListener("notification", (event) => {
      const data = JSON.parse((event as MessageEvent<string>).data) as { unread: number; item: NotificationItem };
      setUnread(data.unread);
      setItems((prev) => [data.item, ...prev.filter((i) => i.id !== data.item.id)].slice(0, MAX_ITEMS));
      setAnnouncement(`Nova notificação: ${data.item.title}`);
    });
    source.onerror = () => {
      // O navegador reconecta sozinho; se desistir (CLOSED, ex.: 401), cai no polling.
      if (source.readyState === EventSource.CLOSED) startPolling();
    };

    return () => {
      source.close();
      if (poll) clearInterval(poll);
    };
  }, [refresh]);

  // Fecha ao clicar fora ou com Esc.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      setUnread((n) => Math.max(0, n - 1));
      await markNotificationReadAction(item.id);
    }
    if (item.href) router.push(item.href);
  }

  async function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnread(0);
    await markAllNotificationsReadAction();
  }

  const label = unread > 0 ? `Notificações, ${unread} não lida${unread === 1 ? "" : "s"}` : "Notificações";

  return (
    <div ref={rootRef} className="relative order-last sm:order-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={label}
        className="relative grid size-11 place-items-center rounded-full text-brand-100 transition hover:bg-white/10"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span
            className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-accent-400 px-1 text-[11px] font-bold text-brand-950 ring-2 ring-brand-900"
            aria-hidden
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      {open && (
        <div className="animate-fade-up absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-card bg-surface text-ink shadow-raised ring-1 ring-line">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="font-display text-sm font-bold text-brand-950">Notificações</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-accent-600"
              >
                <CheckCheck className="size-3.5" aria-hidden /> Marcar todas como lidas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-ink-muted">
              <BellOff className="size-5 text-ink-subtle" aria-hidden />
              Nada por aqui ainda.
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line/70 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "w-full px-4 py-3 transition hover:bg-surface-muted",
                      !item.read && "bg-accent-50/40",
                    )}
                  >
                    <NotificationRow item={item} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/notificacoes"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-surface-muted"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
