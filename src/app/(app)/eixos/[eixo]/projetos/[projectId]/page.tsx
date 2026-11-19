import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui";
import { isEixo } from "@/config/options";
import { DeleteProjectButton, ProjectComponents, ProjectMembers, ProjectSummary, TaskList } from "@/features/projetos";
import { deleteProjectAction } from "@/features/projetos/actions";
import { canManageProjects } from "@/lib/access";
import { getInventory, getLookups, getMembersByIds, getProject, getProjectPurchases } from "@/lib/api";
import { requestsToDeadlineRows } from "@/lib/deadlines";
import { getCurrentMember } from "@/lib/session";

type Props = { params: Promise<{ eixo: string; projectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eixo, projectId } = await params;
  if (!isEixo(eixo)) return { title: "Projeto" };
  const { project, allowed } = await getProject(await getCurrentMember(), eixo, projectId);
  return { title: project && allowed ? project.name : "Projeto" };
}

export default async function ProjectPage({ params }: Props) {
  const { eixo, projectId } = await params;
  if (!isEixo(eixo)) notFound();
  const member = await getCurrentMember();
  const { project, allowed } = await getProject(member, eixo, projectId);
  if (!project) notFound();
  if (!allowed) forbidden();

  const manages = canManageProjects(member, eixo);
  const [inventory, lookups, affiliated, purchases] = await Promise.all([
    getInventory(),
    getLookups(),
    getMembersByIds(project.memberIds),
    getProjectPurchases(project.id),
  ]);
  const { memberNames } = lookups;
  const purchaseRows = requestsToDeadlineRows(purchases, lookups, { viewerId: member.id });
  const listHref = `/eixos/${eixo}/projetos`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href={listHref} className={buttonVariants({ variant: "link", className: "gap-1.5" })}>
          <ArrowLeft className="size-4" aria-hidden /> Projetos do eixo
        </Link>
        <h2 className="font-display text-2xl font-bold tracking-tight text-brand-950">{project.name}</h2>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-8">
          <ProjectSummary
            project={project}
            actions={
              manages && (
                <>
                  <Link href={`${listHref}/${project.id}/editar`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <Pencil className="size-4" aria-hidden /> Editar
                  </Link>
                  <DeleteProjectButton action={deleteProjectAction.bind(null, project.id)} redirectTo={listHref} />
                </>
              )
            }
          />
          <TaskList project={project} memberNames={memberNames} viewerId={member.id} canManage={manages} purchaseRows={purchaseRows} />
        </div>
        <div className="space-y-8">
          <ProjectMembers project={project} members={affiliated} />
          <ProjectComponents project={project} inventory={inventory} canManage={manages} />
        </div>
      </div>
    </div>
  );
}
