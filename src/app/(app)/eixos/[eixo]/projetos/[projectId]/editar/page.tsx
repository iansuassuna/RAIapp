import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui";
import { isEixo } from "@/config/options";
import { ProjectForm } from "@/features/projetos";
import { updateProjectAction } from "@/features/projetos/actions";
import { canManageProjects } from "@/lib/access";
import { getEixoMembers, getProject } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Editar projeto" };

export default async function EditProjectPage({ params }: { params: Promise<{ eixo: string; projectId: string }> }) {
  const { eixo, projectId } = await params;
  if (!isEixo(eixo)) notFound();
  const member = await getCurrentMember();
  const { project } = await getProject(member, eixo, projectId);
  if (!project) notFound();
  if (!canManageProjects(member, eixo)) forbidden();
  const members = (await getEixoMembers(member, eixo)) ?? [];
  const projectHref = `/eixos/${eixo}/projetos/${project.id}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionTitle>Editar “{project.name}”</SectionTitle>
      <Card>
        <ProjectForm
          eixoMembers={members}
          project={project}
          cancelHref={projectHref}
          action={updateProjectAction.bind(null, project.id)}
          projectsHref={`/eixos/${eixo}/projetos`}
        />
      </Card>
    </div>
  );
}
