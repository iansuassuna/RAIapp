"use client";

import { CalendarClock, CalendarDays, Check, Pencil } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, Button, Card, DateInput, SectionTitle } from "@/components/ui";
import type { CycleListItem } from "@/lib/api/cycles";
import { useFormSubmit } from "@/lib/form";
import { formatShortDate } from "@/lib/format";
import { updateCycleAction } from "../actions";
import { cyclePeriodSchema } from "../schemas";

const STATE_LABEL = { encerrado: "Encerrado", vigente: "Vigente", futuro: "Futuro" } as const;
const STATE_TONE = { encerrado: "brand", vigente: "success", futuro: "warning" } as const;

function CycleForm({ cycle, onDone }: { cycle: CycleListItem; onDone: () => void }) {
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(cyclePeriodSchema, async (data) => {
    const result = await updateCycleAction(cycle.id, data);
    if (result.ok) onDone();
    return result;
  });
  return (
    <form
      onSubmit={handleSubmit}
      onChange={handleChange}
      noValidate
      className="mt-3 space-y-3 rounded-card bg-surface-muted/60 p-3 ring-1 ring-line"
    >
      {formError && <Alert tone="danger">{formError}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DateInput
          id={`cycle-${cycle.id}-start`}
          name="startsOn"
          label="Início"
          icon={CalendarDays}
          defaultValue={cycle.startsOn}
          error={errors.startsOn}
        />
        <DateInput
          id={`cycle-${cycle.id}-end`}
          name="endsOn"
          label="Fim"
          icon={CalendarDays}
          defaultValue={cycle.endsOn}
          error={errors.endsOn}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          <Check className="size-4" aria-hidden /> Salvar período
        </Button>
      </div>
    </form>
  );
}

/**
 * Ciclos da avaliação cruzada. O vigente é sempre o que cobre a data de hoje; um ciclo novo é criado
 * automaticamente a cada mês. A diretoria só ajusta as datas de ciclos que ainda não começaram.
 */
export function CycleList({ cycles }: { cycles: CycleListItem[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section aria-labelledby="ciclos" className="space-y-3">
      <SectionTitle id="ciclos">Ciclos de avaliação</SectionTitle>
      <p className="text-sm text-ink-muted">
        Um ciclo é criado automaticamente a cada mês. Depois do fim do ciclo, as avaliações dele não podem mais ser
        enviadas nem alteradas. Só ciclos futuros podem ter as datas ajustadas.
      </p>
      <Card className="p-2">
        <ul className="divide-y divide-line/70">
          {[...cycles].reverse().map((c) => (
            <li key={c.id} className="px-3 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <CalendarClock className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-950">{c.label}</span>
                  <span className="block text-xs text-ink-subtle">
                    {formatShortDate(c.startsOn)} a {formatShortDate(c.endsOn)}
                  </span>
                </span>
                <Badge tone={STATE_TONE[c.state]}>{STATE_LABEL[c.state]}</Badge>
                {c.editable && editing !== c.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(c.id)}
                    aria-label={`Ajustar datas do ciclo ${c.label}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
              {editing === c.id && <CycleForm cycle={c} onDone={() => setEditing(null)} />}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
