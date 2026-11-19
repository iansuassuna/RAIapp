import { Card, Progress, SectionTitle } from "@/components/ui";
import { timeLabel } from "@/config/options";
import type { EixoOverview } from "@/types";

export function TeamPerformance({ teams }: { teams: EixoOverview["teams"] }) {
  return (
    <section aria-labelledby="times" className="space-y-3">
      <SectionTitle id="times">Desempenho por time</SectionTitle>
      <Card className="space-y-5">
        {teams.map((t) => (
          <div key={t.time}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-brand-950">{timeLabel(t.time)}</span>
              <span className="font-display text-sm font-bold text-iris-600">
                {t.score}
                <span className="text-xs font-medium text-ink-subtle">/100</span>
              </span>
            </div>
            <Progress value={t.score} tone="light" label={`Desempenho do time ${timeLabel(t.time)}`} />
          </div>
        ))}
      </Card>
    </section>
  );
}
