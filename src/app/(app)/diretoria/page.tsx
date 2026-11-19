import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryOverview, RequestQueue } from "@/features/requisicoes";
import { getDirectorRequests, getInventory, getLookups } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Diretoria" };

/** Área da diretoria: analisar e resolver as requisições feitas pelos coordenadores. */
export default async function DirectorPage() {
  const requests = await getDirectorRequests(await getCurrentMember());
  if (!requests) forbidden();
  const [inventory, lookups] = await Promise.all([getInventory(), getLookups()]);

  return (
    <div className="space-y-8 pt-7">
      <PageHeader eyebrow="Requisições de componentes e recursos feitas pelas coordenações" title="Diretoria" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <RequestQueue requests={requests} {...lookups} showRequesterContext />
        <InventoryOverview inventory={inventory} />
      </div>
    </div>
  );
}
