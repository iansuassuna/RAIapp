"use client";

import { CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, Card, ScorePanel, SectionTitle } from "@/components/ui";
import { describeMember } from "@/config/options";
import type { Colleague, EvaluationCycle } from "@/types";
import type { EvaluationInput } from "../schemas";
import { EvaluationForm } from "./evaluation-form";

/** Fluxo da avaliação cruzada: lista de colegas → formulário → volta à lista com confirmação. As avaliações são salvas no servidor. */
export function CrossEvaluation({ cycle }: { cycle: EvaluationCycle }) {
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationInput>>(cycle.submitted);
  const [current, setCurrent] = useState<Colleague | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const done = cycle.colleagues.filter((c) => evaluations[c.id]).length;
  const total = cycle.colleagues.length;

  function selectStep(next: Colleague | null) {
    setCurrent(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (current) {
    return (
      <EvaluationForm
        key={current.id}
        colleague={current}
        criteria={cycle.criteria}
        initial={evaluations[current.id]}
        onCancel={() => selectStep(null)}
        onSubmit={(data) => {
          setEvaluations((prev) => ({ ...prev, [current.id]: data }));
          setNotice(`Avaliação de ${current.name} enviada.`);
          selectStep(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <ScorePanel
        id="avaliacoes-progresso"
        title={`Suas avaliações · ciclo ${cycle.label}`}
        score={done}
        goal={total}
        caption={
          done === total
            ? "Tudo pronto! Você avaliou todos os colegas deste ciclo."
            : `Faltam ${total - done} ${total - done === 1 ? "colega" : "colegas"} para concluir o ciclo.`
        }
      />

      {notice && (
        <p
          role="status"
          className="animate-fade-up flex items-center gap-2 rounded-field bg-success-50 px-4 py-3 text-sm font-medium text-success-700"
        >
          <CheckCircle2 className="size-4 shrink-0" /> {notice}
        </p>
      )}

      <section aria-labelledby="colegas" className="space-y-3">
        <SectionTitle id="colegas">Colegas para avaliar</SectionTitle>
        <Card className="p-2">
          <ul className="divide-y divide-line/70">
            {cycle.colleagues.map((c) => {
              const completed = Boolean(evaluations[c.id]);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      selectStep(c);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-surface-muted/70"
                  >
                    <Avatar decorative name={c.name} className="size-10 ring-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-brand-950">{c.name}</span>
                      <span className="block text-xs text-ink-subtle">{describeMember(c)}</span>
                    </span>
                    <Badge tone={completed ? "success" : "warning"}>{completed ? "Concluída" : "Pendente"}</Badge>
                    <ChevronRight aria-hidden className="size-4 text-ink-subtle" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
        <p className="px-1 text-xs text-ink-subtle">Toque em um colega para avaliar ou revisar sua avaliação.</p>
      </section>
    </div>
  );
}
