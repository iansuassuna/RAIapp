import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ACTIVITY_TYPE_ICON } from "@/config/activity-icons";
import { ACTIVITY_STATUS_LABEL, ACTIVITY_STATUS_TONE, ACTIVITY_TYPE_LABEL } from "@/config/options";
import { formatShortDate } from "@/lib/format";
import type { Activity } from "@/types";

export function RecentActivities({ activities }: { activities: Activity[] }) {
  return (
    <section aria-labelledby="atividades" className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle id="atividades">Atividades recentes</SectionTitle>
        <Link
          href="/atividades"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-accent-600"
        >
          Ver todas <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>

      <Card className="p-2">
        {activities.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">
            Nenhuma atividade registrada ainda. A coordenação do seu eixo registra suas capacitações, cursos e visitas.
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {activities.map((a) => {
              const Icon = ACTIVITY_TYPE_ICON[a.type];
              return (
                <li key={a.id}>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-brand-950">{a.title}</span>
                      <span className="block text-xs text-ink-subtle">
                        {ACTIVITY_TYPE_LABEL[a.type]} · {formatShortDate(a.date)}
                      </span>
                    </span>
                    <Badge tone={ACTIVITY_STATUS_TONE[a.status]}>{ACTIVITY_STATUS_LABEL[a.status]}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
