"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, useState } from "react";
import { cn } from "@/lib/cn";
import { FieldShell, fieldControlClass } from "./field";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  ({ id, label, error, hint, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const Toggle = visible ? EyeOff : Eye;

    return (
      <FieldShell
        id={id}
        label={label}
        icon={Lock}
        error={error}
        hint={hint}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            className="grid size-10 place-items-center rounded-lg text-ink-subtle transition hover:bg-surface-muted hover:text-brand-900"
          >
            <Toggle className="size-[18px]" />
          </button>
        }
      >
        <input
          ref={ref}
          id={id}
          name={props.name ?? id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(fieldControlClass, "pr-14", className)}
          {...props}
        />
      </FieldShell>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
