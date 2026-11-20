import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { buttonVariants, SectionTitle } from "@/components/ui";
import { isEixo } from "@/config/options";
import { ProjectList } from "@/features/projetos";
import { canManageProjects } from "@/lib/access";
import { getEixoProjects } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Projetos do eixo" };

export default async function EixoProjectsPage({ params }: { params: Promise<{ eixo: string }> }) {
  const { eixo } = await params;
  if (!isEixo(eixo)) notFound();
  const member = await getCurrentMember();
  const projects = await getEixoProjects(member, eixo);
  if (!projects) forbidden();
  const manages = canManageProjects(member, eixo);
  const active = projects.filter((p) => p.status !== "concluido");
  const finished = projects.filter((p) => p.status === "concluido");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>
          {active.length} {active.length === 1 ? "projeto ativo" : "projetos ativos"}
        </SectionTitle>
        {manages && (
          <Link href={`/eixos/${eixo}/projetos/novo`} className={buttonVariants({ size: "md" })}>
            <Plus className="size-4" aria-hidden /> Novo projeto
          </Link>
        )}
      </div>
      <ProjectList
        projects={active}
        emptyTitle="Nenhum projeto ativo"
        emptyText={manages ? "Crie o primeiro projeto do eixo." : "A coordenação ainda não cadastrou projetos."}
      />
      {finished.length > 0 && (
        <section aria-labelledby="concluidos" className="space-y-3">
          <SectionTitle id="concluidos">Concluídos</SectionTitle>
          <ProjectList projects={finished} />
        </section>
      )}
    </div>
  );
}
