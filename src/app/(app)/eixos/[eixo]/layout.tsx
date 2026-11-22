import { forbidden, notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { type SectionTab, SectionTabs } from "@/components/ui";
import { eixoLabel, isEixo } from "@/config/options";
import { EixoTabs } from "@/features/eixos";
import { canManageEixo, canUseCoordinationPanel, canViewEixo, getAccessibleEixos } from "@/lib/access";
import { countPendingRequests, getPanelProposals } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

/** Área de um eixo: checa acesso uma vez e monta cabeçalho + abas de seção. */
export default async function EixoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eixo: string }>;
}) {
  const { eixo } = await params;
  if (!isEixo(eixo)) notFound();

  const member = await getCurrentMember();
  if (!canViewEixo(member, eixo)) forbidden();

  const accessible = getAccessibleEixos(member);
  const manages = canManageEixo(member, eixo);
  const base = `/eixos/${eixo}`;

  const tabs: SectionTab[] = [
    { href: base, label: "Visão geral", exact: true },
    { href: `${base}/projetos`, label: "Projetos" },
    { href: `${base}/membros`, label: "Membros" },
  ];
  if (canUseCoordinationPanel(member, eixo)) {
    const [pendingRequests, panelProposals] = await Promise.all([
      countPendingRequests({ reviewer: "coordenacao", eixo }),
      getPanelProposals(member, eixo),
    ]);
    tabs.push({
      href: `${base}/painel`,
      label: "Painel da Coordenação",
      count: pendingRequests + panelProposals.length,
    });
  }

  return (
    <div className="space-y-6 pt-7">
      <PageHeader
        eyebrow={
          manages
            ? "Você coordena este eixo"
            : accessible.length > 1
              ? "Acompanhe cada eixo do grupo"
              : "Acompanhe o seu eixo"
        }
        title={accessible.length > 1 ? "Gestão de Eixos" : eixoLabel(eixo)}
      />
      {accessible.length > 1 && <EixoTabs eixos={accessible} active={eixo} />}
      <SectionTabs label={`Seções do eixo ${eixoLabel(eixo)}`} tabs={tabs} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
