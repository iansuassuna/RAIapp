"use client";

import { type ReactNode, useState, useTransition } from "react";
import { Button } from "./button";

type Props = {
  /** Ação executada depois da confirmação. */
  onConfirm: () => unknown;
  children: ReactNode;
  confirmLabel?: string;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
};

/** Botão destrutivo em dois passos (sem `confirm()` do navegador): 1º clique pede confirmação, 2º executa. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Confirmar exclusão",
  size = "sm",
  className,
  ...rest
}: Props) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!armed) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={className}
        onClick={() => setArmed(true)}
        aria-label={rest["aria-label"]}
      >
        {children}
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="danger"
        size={size}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            await onConfirm();
            setArmed(false);
          })
        }
      >
        {confirmLabel}
      </Button>
      <Button type="button" variant="ghost" size={size} onClick={() => setArmed(false)} disabled={pending}>
        Cancelar
      </Button>
    </span>
  );
}
