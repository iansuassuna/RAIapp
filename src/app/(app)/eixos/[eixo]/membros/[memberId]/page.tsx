import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { Avatar, buttonVariants } from "@/components/ui";
import { isEixo, memberRoleOrTime } from "@/config/options";
import { MemberEvaluations } from "@/features/avaliacao";
import { MemberScorePanel } from "@/features/pontuacao";
import { getMember, getMemberActivities, getMemberEvaluations, getScoreHistory } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Membro do eixo" };

/** Atividades, pontuação e avaliações cruzadas detalhadas de um membro — só para a coordenação do eixo dele. */
export default async function MemberEvaluationsPage({
  params,
}: {
  params: Promise<{ eixo: string; memberId: string }>;
}) {
  const { eixo, memberId } = await params;
  if (!isEixo(eixo)) notFound();
  const target = await getMember(memberId);
  if (!target || target.eixo !== eixo) notFound();

  const viewer = await getCurrentMember();
  const [report, activities, history] = await Promise.all([
    getMemberEvaluations(viewer, memberId),
    getMemberActivities(viewer, memberId),
    getScoreHistory(viewer, memberId),
  ]);
  if (!report || !activities || !history) forbidden();

  return (
    <div className="space-y-6">
      <Link href={`/eixos/${eixo}/membros`} className={buttonVariants({ variant: "link", className: "gap-1.5" })}>
        <ArrowLeft className="size-4" aria-hidden /> Membros do eixo
      </Link>
      <div className="flex items-center gap-4">
        <Avatar decorative name={target.name} src={target.avatarUrl} className="size-14 text-base" />
        <div>
          <p className="text-xs text-ink-subtle">Membro do eixo</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-brand-950">{target.name}</h2>
          <p className="text-sm text-ink-muted">{memberRoleOrTime(target)}</p>
        </div>
      </div>
      <MemberScorePanel
        memberId={memberId}
        score={history.score}
        activities={activities}
        entries={history.entries}
        canManage={history.canManage}
        scoreTitle={`Pontuação de ${target.name.split(" ")[0]}`}
      />
      <h3 className="pt-2 font-display text-lg font-bold text-brand-950">Avaliações cruzadas recebidas</h3>
      <MemberEvaluations cycles={report.cycles} />
    </div>
  );
}
