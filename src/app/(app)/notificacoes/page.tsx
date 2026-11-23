import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationList } from "@/features/notificacoes";
import { countUnreadNotifications, listNotifications } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Notificações" };

type Props = { searchParams: Promise<{ antes?: string | string[] }> };

export default async function NotificationsPage({ searchParams }: Props) {
  const member = await getCurrentMember();
  const { antes } = await searchParams;
  const cursor = typeof antes === "string" ? antes : null;
  const [page, unread] = await Promise.all([listNotifications(member, cursor), countUnreadNotifications(member.id)]);

  return (
    <div className="max-w-3xl space-y-8 pt-7">
      <PageHeader
        eyebrow={unread > 0 ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Tudo em dia"}
        title="Notificações"
      />
      <NotificationList
        key={cursor ?? "inicio"}
        items={page.items}
        hasUnread={unread > 0}
        nextHref={page.nextCursor ? `/notificacoes?antes=${encodeURIComponent(page.nextCursor)}` : null}
      />
    </div>
  );
}
