import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui";
import { MEMBER_STANDING_LABEL, MEMBER_STANDING_TONE, ROLE_LABEL, timeLabel } from "@/config/options";
import type { EixoMember } from "@/types";

type Props = {
  members: EixoMember[];
  /** Base do link para as avaliações detalhadas (só para a coordenação). Ex.: /eixos/inovacao/membros */
  evaluationsHref?: string;
};

/** Todos os membros associados ao eixo, ordenados pela pontuação no ciclo. */
export function EixoMembers({ members, evaluationsHref }: Props) {
  if (members.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="Nenhum membro associado a este eixo" />
      </Card>
    );
  }
  return (
    <Card className="p-2">
      <ol className="divide-y divide-line/70">
        {members.map((m, i) => {
          const content = (
            <>
              <span className="w-6 text-center font-display text-sm font-extrabold text-iris-600">{i + 1}º</span>
              <Avatar decorative name={m.name} className="size-10 ring-0" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-brand-950">{m.name}</span>
                  {m.role !== "membro" && (
                    <Badge tone="accent" dot={false} className="px-2 py-0.5 text-[10px]">
                      {ROLE_LABEL[m.role]}
                    </Badge>
                  )}
                </span>
                <span className="block text-xs text-ink-subtle">
                  {m.time ? `${timeLabel(m.time)} · ` : ""}{m.score} pts
                </span>
              </span>
              <Badge tone={MEMBER_STANDING_TONE[m.standing]}>{MEMBER_STANDING_LABEL[m.standing]}</Badge>
            </>
          );
          return (
            <li key={m.id}>
              {evaluationsHref ? (
                <Link
                  href={`${evaluationsHref}/${m.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-muted/70"
                  aria-label={`Ver avaliações de ${m.name}`}
                >
                  {content}
                  <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-3 py-3">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
