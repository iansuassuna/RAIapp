import { Users } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, SectionTitle } from "@/components/ui";
import { ROLE_LABEL, timeLabel } from "@/config/options";
import type { Member, Project } from "@/types";

/** Membros afiliados ao projeto, com quantas tarefas cada um tem em aberto. */
export function ProjectMembers({ project, members }: { project: Project; members: Member[] }) {
  return (
    <section aria-labelledby="afiliados" className="space-y-3">
      <SectionTitle id="afiliados">Membros afiliados</SectionTitle>
      <Card className="p-2">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum membro afiliado" />
        ) : (
          <ul className="divide-y divide-line/70">
            {members.map((m) => {
              const open = project.tasks.filter((t) => t.assigneeId === m.id && t.status !== "concluida").length;
              return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-3">
                  <Avatar decorative name={m.name} className="size-10 ring-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-950">{m.name}</span>
                    <span className="block text-xs text-ink-subtle">
                      {m.time ? `${timeLabel(m.time)} · ` : ""}{open} {open === 1 ? "tarefa aberta" : "tarefas abertas"}
                    </span>
                  </span>
                  {m.role !== "membro" && <Badge tone="accent">{ROLE_LABEL[m.role]}</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
