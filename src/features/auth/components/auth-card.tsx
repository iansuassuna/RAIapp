import type { ReactNode } from "react";

type Props = { title: string; subtitle: string; children: ReactNode; footer?: ReactNode };

export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <div className="animate-fade-up w-full max-w-md">
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-950">{title}</h1>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </div>
      {children}
      {footer && <div className="mt-8 text-center text-sm text-ink-muted">{footer}</div>}
    </div>
  );
}
