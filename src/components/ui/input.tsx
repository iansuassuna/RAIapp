import type { LucideIcon } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FieldShell, fieldControlClass } from "./field";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, icon, error, hint, className, ...props }, ref) => (
    <FieldShell id={id} label={label} icon={icon} error={error} hint={hint}>
      <input
        ref={ref}
        id={id}
        name={props.name ?? id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(fieldControlClass, className)}
        {...props}
      />
    </FieldShell>
  ),
);
Input.displayName = "Input";
