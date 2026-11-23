import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { MemberScorePanel } from "@/features/pontuacao";
import { getMemberActivities, getScoreHistory } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Minhas atividades" };

/** Atividades e histórico de pontos do próprio membro (somente leitura: quem lança é a coordenação/diretoria). */
export default async function MyActivitiesPage() {
  const member = await getCurrentMember();
  const [activities, history] = await Promise.all([
    getMemberActivities(member, member.id),
    getScoreHistory(member, member.id),
  ]);
  if (!activities || !history) notFound();

  return (
    <div className="space-y-8 pt-7">
      <PageHeader eyebrow="Sua trajetória no RAITec" title="Minhas atividades" />
      <MemberScorePanel
        memberId={member.id}
        score={history.score}
        activities={activities}
        entries={history.entries}
        canManage={false}
        scoreTitle="Sua pontuação"
      />
    </div>
  );
}
