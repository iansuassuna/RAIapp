import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { isEixo, ownerSelectOptions } from "@/config/options";
import { ProposalList } from "@/features/inventario";
import { RequestPanel } from "@/features/requisicoes";
import { assignableOwners, canUseCoordinationPanel } from "@/lib/access";
import { getEixoRequests, getInventory, getLookups, getPanelProposals } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";
import type { InventoryItem } from "@/types";

export const metadata: Metadata = { title: "Painel da Coordenação" };

/**
 * Painel da Coordenação: requisições dos membros (para analisar e em andamento),
 * compras aguardando, autorizações ativas e propostas de inventário do time Processos.
 * Coordenação do eixo ou diretoria (que age em todos os eixos).
 */
export default async function CoordinationPanelPage({ params }: { params: Promise<{ eixo: string }> }) {
  const { eixo } = await params;
  if (!isEixo(eixo)) notFound();
  const member = await getCurrentMember();
  if (!canUseCoordinationPanel(member, eixo)) forbidden();

  const [requests, proposals, inventory, lookups] = await Promise.all([
    getEixoRequests(member, eixo),
    getPanelProposals(member, eixo),
    getInventory(),
    getLookups(),
  ]);
  if (!requests) forbidden();
  const items = Object.fromEntries(inventory.map((i) => [i.id, i as InventoryItem]));

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <RequestPanel
        requests={requests}
        lookups={lookups}
        mode="eixo"
        ownerOptions={ownerSelectOptions(assignableOwners(member))}
        defaultOwner={eixo}
      />
      <ProposalList
        title="Alterações de inventário propostas"
        proposals={proposals}
        items={items}
        memberNames={lookups.memberNames}
        canDecide
        emptyText="Nenhuma proposta do time Processos"
      />
    </div>
  );
}
