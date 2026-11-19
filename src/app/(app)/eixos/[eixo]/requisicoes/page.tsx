import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { isEixo } from "@/config/options";
import { InventoryOverview, RequestQueue } from "@/features/requisicoes";
import { getEixoRequests, getInventory, getLookups } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Requisições" };

/** Área da coordenação: analisar e resolver requisições de componentes e recursos do eixo. */
export default async function EixoRequestsPage({ params }: { params: Promise<{ eixo: string }> }) {
  const { eixo } = await params;
  if (!isEixo(eixo)) notFound();
  const requests = await getEixoRequests(await getCurrentMember(), eixo);
  if (!requests) forbidden();
  const [inventory, lookups] = await Promise.all([getInventory(), getLookups()]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
      <RequestQueue requests={requests} {...lookups} />
      <InventoryOverview inventory={inventory} />
    </div>
  );
}
