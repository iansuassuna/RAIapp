import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Linha pequena acima do título. */
  eyebrow?: ReactNode;
  /** Botões/links à direita (empilham no mobile). */
  actions?: ReactNode;
};

/** Cabeçalho padrão das telas internas. */
export function PageHeader({ title, eyebrow, actions }: Props) {
  return (
    <div className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-ink-muted">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
