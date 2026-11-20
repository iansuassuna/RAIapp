import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RequestPanel } from "@/features/requisicoes";
import { getDirectorRequests, getLookups } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Diretoria" };

/** Área da diretoria: pedidos das coordenações (analisar e marcar como feito). */
export default async function DirectorPage() {
  const requests = await getDirectorRequests(await getCurrentMember());
  if (!requests) forbidden();
  const lookups = await getLookups();

  return (
    <div className="space-y-8 pt-7">
      <PageHeader eyebrow="Pedidos das coordenações dos eixos" title="Diretoria" />
      <div className="max-w-3xl">
        <RequestPanel requests={requests} lookups={lookups} mode="diretoria" />
      </div>
    </div>
  );
}
