import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NotificationBell } from "@/features/notificacoes";
import { getNotificationSummary } from "@/lib/api";
import { getCurrentMember, getDevQuickSwitchMembers } from "@/lib/session";

/** Layout das telas autenticadas: header + conteúdo + navegação inferior no mobile. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [member, devMembers] = await Promise.all([getCurrentMember(), getDevQuickSwitchMembers()]);
  const summary = await getNotificationSummary(member);
  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      <AppHeader
        member={member}
        devMembers={devMembers}
        notifications={<NotificationBell initialUnread={summary.unread} initialItems={summary.items} />}
      />
      <main className="mx-auto max-w-5xl px-5">{children}</main>
      <BottomNav role={member.role} />
    </div>
  );
}
