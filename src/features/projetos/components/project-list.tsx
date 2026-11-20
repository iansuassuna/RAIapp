import { FolderKanban } from "lucide-react";
import type { ReactNode } from "react";
import { Card, EmptyState } from "@/components/ui";
import type { Project } from "@/types";
import { ProjectCard } from "./project-card";

type Props = { projects: Project[]; showEixo?: boolean; emptyTitle?: string; emptyText?: ReactNode };

export function ProjectList({ projects, showEixo, emptyTitle = "Nenhum projeto ainda", emptyText }: Props) {
  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState icon={FolderKanban} title={emptyTitle}>
          {emptyText}
        </EmptyState>
      </Card>
    );
  }
  return (
    // Colunas pela largura do contêiner (não da tela): funciona em página cheia e em meia coluna.
    <div className="@container">
      <div className="grid gap-4 @xl:grid-cols-2">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} showEixo={showEixo} />
        ))}
      </div>
    </div>
  );
}
