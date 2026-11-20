import { RATING_SCALE } from "@/config/options";
import { cn } from "@/lib/cn";
import type { EvaluationCriterion } from "@/types";

type Props = { criterion: EvaluationCriterion; defaultValue?: number; error?: string };

/** Escala 1–5 feita com <input type="radio"> reais: funciona com FormData, teclado e leitores de tela. */
export function RatingScale({ criterion, defaultValue, error }: Props) {
  const errorId = `${criterion.id}-error`;
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className={cn(
        "rounded-card bg-surface p-4 shadow-card ring-1 ring-line/60",
        error && "ring-2 ring-danger-500",
      )}
    >
      <legend className="sr-only">{criterion.label}</legend>
      <p aria-hidden className="font-display text-sm font-bold text-brand-900">
        {criterion.label}
      </p>
      <p className="text-xs text-ink-muted">{criterion.description}</p>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {RATING_SCALE.map(({ value, label }) => (
          <label
            key={value}
            title={label}
            className="grid h-11 cursor-pointer place-items-center rounded-field bg-surface-muted font-display text-base font-bold text-brand-900 transition hover:bg-brand-100 has-checked:bg-brand-900 has-checked:text-white has-checked:shadow-glow has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-500"
          >
            <input
              type="radio"
              name={criterion.id}
              value={value}
              defaultChecked={defaultValue === value}
              className="sr-only"
            />
            <span aria-hidden>{value}</span>
            <span className="sr-only">
              {value} — {label}
            </span>
          </label>
        ))}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 pl-1 text-xs font-medium text-danger-500">
          {error}
        </p>
      )}
    </fieldset>
  );
}
