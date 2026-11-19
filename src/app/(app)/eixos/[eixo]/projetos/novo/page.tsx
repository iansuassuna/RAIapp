import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui";
import { isEixo } from "@/config/options";
import { ProjectForm } from "@/features/projetos";
import { createProjectAction } from "@/features/projetos/actions";
import { canManageProjects } from "@/lib/access";
import { getEixoMembers } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NewProjectPage({ params }: { params: Promise<{ eixo: string }> }) {
  const { eixo } = await params;
  if (!isEixo(eixo)) notFound();
  const member = await getCurrentMember();
  if (!canManageProjects(member, eixo)) forbidden();
  const members = (await getEixoMembers(member, eixo)) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle>Novo projeto</SectionTitle>
      <Card>
        <ProjectForm
          eixoMembers={members}
          cancelHref={`/eixos/${eixo}/projetos`}
          action={createProjectAction.bind(null, eixo)}
          projectsHref={`/eixos/${eixo}/projetos`}
        />
      </Card>
    </div>
  );
}
