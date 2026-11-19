import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getCurrentMember, getDevMembers } from "@/lib/session";

/** Layout das telas autenticadas: header + conteúdo + navegação inferior no mobile. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [member, devMembers] = await Promise.all([getCurrentMember(), getDevMembers()]);
  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      <AppHeader member={member} devMembers={devMembers} />
      <main className="mx-auto max-w-5xl px-5">{children}</main>
      <BottomNav role={member.role} />
    </div>
  );
}
