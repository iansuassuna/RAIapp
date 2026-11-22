import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { Avatar, buttonVariants } from "@/components/ui";
import { isEixo, memberRoleOrTime } from "@/config/options";
import { MemberEvaluations } from "@/features/avaliacao";
import { getMember, getMemberEvaluations } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Avaliações do membro" };

/** Avaliações cruzadas detalhadas de um membro — só para a coordenação do eixo dele. */
export default async function MemberEvaluationsPage({
  params,
}: {
  params: Promise<{ eixo: string; memberId: string }>;
}) {
  const { eixo, memberId } = await params;
  if (!isEixo(eixo)) notFound();
  const target = await getMember(memberId);
  if (!target || target.eixo !== eixo) notFound();

  const report = await getMemberEvaluations(await getCurrentMember(), memberId);
  if (!report) forbidden();

  return (
    <div className="space-y-6">
      <Link href={`/eixos/${eixo}/membros`} className={buttonVariants({ variant: "link", className: "gap-1.5" })}>
        <ArrowLeft className="size-4" aria-hidden /> Membros do eixo
      </Link>
      <div className="flex items-center gap-4">
        <Avatar decorative name={target.name} className="size-14 text-base" />
        <div>
          <p className="text-xs text-ink-subtle">Avaliações cruzadas recebidas</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-brand-950">{target.name}</h2>
          <p className="text-sm text-ink-muted">{memberRoleOrTime(target)}</p>
        </div>
      </div>
      <MemberEvaluations cycles={report.cycles} />
    </div>
  );
}
