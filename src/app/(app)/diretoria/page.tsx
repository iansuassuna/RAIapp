import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { RequestPanel } from "@/features/requisicoes";
import { getDirectorRequests, getLookups } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Diretoria" };

/** Pedidos das coordenações dos eixos (analisar e marcar como feito). */
export default async function DirectorPage() {
  const member = await getCurrentMember();
  const [requests, lookups] = await Promise.all([getDirectorRequests(member), getLookups()]);
  if (!requests) forbidden();

  return (
    <div className="max-w-3xl">
      <RequestPanel requests={requests} lookups={lookups} mode="diretoria" />
    </div>
  );
}
