import { ScorePanel } from "@/components/ui";
import type { Performance } from "@/types";

export function PerformanceCard({ performance }: { performance: Performance }) {
  const { score, goal } = performance;
  return (
    <ScorePanel
      id="perf-title"
      title="Seu desempenho"
      score={score}
      goal={goal}
      caption={
        <>
          Faltam <span className="font-semibold text-white">{goal - score} pontos</span> para completar a meta do ciclo.
        </>
      }
    />
  );
}
