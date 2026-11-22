import type { Metadata } from "next";
import { SectionTitle } from "@/components/ui";
import { AssignedTasks, ProjectList } from "@/features/projetos";
import { getAssignedTasks, getLookups, getMemberProjects, getRequestDeadlines } from "@/lib/api";
import { requestsToDeadlineRows } from "@/lib/deadlines";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Minha área" };

export default async function MemberAreaPage() {
  const member = await getCurrentMember();
  const [projects, tasks, deadlines, lookups] = await Promise.all([
    getMemberProjects(member),
    getAssignedTasks(member),
    getRequestDeadlines(member),
    getLookups(),
  ]);
  // Compras do eixo que a coordenação precisa fazer levam ao Painel; as próprias, às requisições.
  const requestRows = requestsToDeadlineRows(
    deadlines.map((d) => d.request),
    lookups,
    {
      viewerId: member.id,
      href: (r) => (r.memberId === member.id ? "/minha-area/requisicoes" : `/eixos/${r.eixo}/painel`),
    },
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <AssignedTasks items={tasks} requestRows={requestRows} />
      <section aria-labelledby="afiliados" className="space-y-3">
        <SectionTitle id="afiliados">Projetos afiliados</SectionTitle>
        <ProjectList
          projects={projects}
          showEixo={member.role === "diretoria"}
          emptyTitle="Você não está afiliado a projetos"
          emptyText="A coordenação do seu eixo afilia os membros aos projetos."
        />
      </section>
    </div>
  );
}
