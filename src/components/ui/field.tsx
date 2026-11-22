import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Estilo compartilhado por Input, PasswordInput e Select. */
export const fieldControlClass =
  "peer h-14 w-full rounded-field bg-surface pl-11 pr-4 pt-5 pb-1.5 text-[15px] text-ink ring-1 ring-line transition placeholder:text-ink-subtle/80 hover:ring-brand-200 focus:outline-none focus:ring-2 focus:ring-accent-500 aria-[invalid=true]:ring-danger-500";

type FieldShellProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Campos de várias linhas: ícone e ação ficam no topo em vez de centralizados. */
  multiline?: boolean;
};

/**
 * Casca do campo: rótulo flutuante, ícone à esquerda, ação opcional à direita
 * e mensagem de erro acessível. Mantém o visual "rótulo + placeholder" do protótipo.
 */
export function FieldShell({
  id,
  label,
  icon: Icon,
  error,
  hint,
  trailing,
  children,
  className,
  multiline,
}: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        {children}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-11 top-2 font-display text-xs font-semibold text-brand-900"
        >
          {label}
        </label>
        <Icon
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-4 size-[18px] text-ink-subtle transition peer-focus:text-accent-600",
            multiline ? "top-4" : "top-1/2 -translate-y-1/2",
          )}
        />
        {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="pl-1 text-xs font-medium text-danger-500">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-1 text-xs text-ink-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
