import { FolderKanban, UserRound } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import type { Loan } from "@/types";

type Props = {
  projects: { projectId: string; eixo: string; name: string; quantity: number }[];
  loans: Loan[];
  memberNames: Record<string, string>;
};

/** Onde as unidades em uso estão. */
export function ItemUsage({ projects, loans, memberNames }: Props) {
  const empty = projects.length === 0 && loans.length === 0;
  return (
    <section aria-labelledby="em-uso" className="space-y-3">
      <SectionTitle id="em-uso">Em uso</SectionTitle>
      <Card className="p-2">
        {empty ? (
          <EmptyState icon={FolderKanban} title="Nenhuma unidade em uso" />
        ) : (
          <ul className="divide-y divide-line/70">
            {projects.map((p) => (
              <li key={p.projectId} className="flex items-center gap-3 px-3 py-3">
                <FolderKanban className="size-4 text-ink-subtle" aria-hidden />
                <Link
                  href={`/eixos/${p.eixo}/projetos/${p.projectId}`}
                  className="flex-1 text-sm font-semibold text-brand-700 hover:text-accent-600 hover:underline"
                >
                  {p.name}
                </Link>
                <span className="font-display text-sm font-bold text-iris-600">×{p.quantity}</span>
              </li>
            ))}
            {loans.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-3 py-3">
                <UserRound className="size-4 text-ink-subtle" aria-hidden />
                <span className="flex-1 text-sm text-brand-950">Emprestado a {memberNames[l.memberId] ?? "—"}</span>
                <span className="font-display text-sm font-bold text-iris-600">×{l.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
