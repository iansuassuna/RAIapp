import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type Option = { value: string; label: string; hint?: string };

type Props = {
  name: string;
  legend: string;
  options: Option[];
  defaultValues?: string[];
  error?: string;
  hint?: string;
};

/** Lista de checkboxes reais (funciona com FormData; valores repetidos viram array em `formDataToObject`). */
export function CheckboxGroup({ name, legend, options, defaultValues = [], error, hint }: Props) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="space-y-2">
      <legend className="pl-1 font-display text-xs font-semibold text-brand-900">{legend}</legend>
      {hint && <p className="pl-1 text-xs text-ink-subtle">{hint}</p>}
      <div className={cn("grid gap-2 sm:grid-cols-2", error && "rounded-field ring-2 ring-danger-500 p-1")}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field bg-surface px-3 py-2 ring-1 ring-line transition hover:ring-brand-200 has-checked:bg-brand-50 has-checked:ring-brand-300 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-500"
          >
            <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValues.includes(o.value)} className="peer sr-only" />
            <span className="grid size-5 shrink-0 place-items-center rounded-md ring-1 ring-line bg-surface text-transparent transition peer-checked:bg-brand-900 peer-checked:text-white peer-checked:ring-brand-900">
              <Check className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-brand-950">{o.label}</span>
              {o.hint && <span className="block text-xs text-ink-subtle">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="pl-1 text-xs font-medium text-danger-500">
          {error}
        </p>
      )}
    </fieldset>
  );
}
