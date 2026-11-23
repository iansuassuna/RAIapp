import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  FolderKanban,
  type LucideIcon,
  PackageOpen,
  Shield,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import type { NotificationItem, NotificationType } from "@/types";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  "requisicao-nova": PackageOpen,
  "requisicao-resolvida": PackageOpen,
  "requisicao-andamento": PackageOpen,
  "proposta-nova": ClipboardCheck,
  "proposta-resolvida": ClipboardCheck,
  "tarefa-atribuida": FolderKanban,
  "tarefa-atualizada": FolderKanban,
  "projeto-adicionado": FolderKanban,
  "papel-alterado": Shield,
  pontos: Star,
  "ciclo-novo": CalendarClock,
};

/** Conteúdo de uma linha de notificação (ícone, título, texto, tempo e marcador de não lida). */
export function NotificationRow({ item }: { item: NotificationItem }) {
  const Icon = TYPE_ICON[item.type] ?? Bell;
  return (
    <span className="flex w-full items-start gap-3 text-left">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          item.read ? "bg-surface-muted text-ink-subtle" : "bg-accent-50 text-accent-700",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm", item.read ? "text-ink-muted" : "font-semibold text-brand-950")}>
          {item.title}
        </span>
        {item.body && <span className="line-clamp-2 block text-xs text-ink-subtle">{item.body}</span>}
        <span className="mt-0.5 block text-[11px] text-ink-subtle">{formatRelativeTime(item.createdAt)}</span>
      </span>
      {!item.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-500" aria-label="Não lida" role="img" />
      )}
    </span>
  );
}
