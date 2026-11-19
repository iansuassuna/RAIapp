import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { SectionTitle } from "@/components/ui";
import { isEixo } from "@/config/options";
import { EixoMembers } from "@/features/eixos";
import { canManageEixo } from "@/lib/access";
import { getEixoMembers } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Membros do eixo" };

export default async function EixoMembersPage({ params }: { params: Promise<{ eixo: string }> }) {
  const { eixo } = await params;
  if (!isEixo(eixo)) notFound();
  const member = await getCurrentMember();
  const members = await getEixoMembers(member, eixo);
  if (!members) forbidden();
  const manages = canManageEixo(member, eixo);

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>
          {members.length} {members.length === 1 ? "membro associado" : "membros associados"}
        </SectionTitle>
        <p className="text-xs text-ink-subtle">
          {manages ? "Toque em um membro para ver as avaliações cruzadas detalhadas." : "Ordenados pela pontuação no ciclo."}
        </p>
      </div>
      <EixoMembers members={members} evaluationsHref={manages ? `/eixos/${eixo}/membros` : undefined} />
    </div>
  );
}
