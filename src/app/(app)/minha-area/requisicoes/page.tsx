import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DirectorRequestForm, MyRequests, RequestForm } from "@/features/requisicoes";
import { createRequestAction } from "@/features/requisicoes/actions";
import { requestReviewerFor } from "@/lib/access";
import { getInventory, getLookups, getMyRequests, getRequestableProjects } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Requisições" };

/** Membros pedem à coordenação (por tipo); coordenadores pedem à diretoria (título/explicação/justificativa). */
export default async function MemberRequestsPage() {
  const member = await getCurrentMember();
  const reviewer = requestReviewerFor(member);
  if (!reviewer) redirect("/diretoria");

  const [inventory, projects, requests, lookups] = await Promise.all([
    getInventory(),
    getRequestableProjects(member),
    getMyRequests(member),
    getLookups(),
  ]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      {reviewer === "diretoria" ? (
        <DirectorRequestForm action={createRequestAction} />
      ) : (
        <RequestForm action={createRequestAction} inventory={inventory} projects={projects.map(({ id, name }) => ({ id, name }))} />
      )}
      <MyRequests requests={requests} lookups={lookups} />
    </div>
  );
}
