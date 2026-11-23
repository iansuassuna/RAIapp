import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { Avatar, buttonVariants } from "@/components/ui";
import { describeMember } from "@/config/options";
import { MemberScorePanel } from "@/features/pontuacao";
import { getMember, getMemberActivities, getScoreHistory } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Pontuação do membro · Diretoria" };

/** Atividades e pontuação de qualquer pessoa (inclusive coordenadores) — gestão pela diretoria. */
export default async function DirectorMemberScorePage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const target = await getMember(memberId);
  if (!target) notFound();

  const viewer = await getCurrentMember();
  const [activities, history] = await Promise.all([
    getMemberActivities(viewer, memberId),
    getScoreHistory(viewer, memberId),
  ]);
  if (!activities || !history?.canManage) forbidden();

  return (
    <div className="space-y-6">
      <Link href="/diretoria/membros" className={buttonVariants({ variant: "link", className: "gap-1.5" })}>
        <ArrowLeft className="size-4" aria-hidden /> Membros e papéis
      </Link>
      <div className="flex items-center gap-4">
        <Avatar decorative name={target.name} src={target.avatarUrl} className="size-14 text-base" />
        <div>
          <p className="text-xs text-ink-subtle">Atividades e pontuação</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-brand-950">{target.name}</h2>
          <p className="text-sm text-ink-muted">{describeMember(target)}</p>
        </div>
      </div>
      <MemberScorePanel
        memberId={memberId}
        score={history.score}
        activities={activities}
        entries={history.entries}
        canManage
        scoreTitle={`Pontuação de ${target.name.split(" ")[0]}`}
      />
    </div>
  );
}
