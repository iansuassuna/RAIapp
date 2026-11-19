import type { LucideIcon } from "lucide-react";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FieldShell, fieldControlClass } from "./field";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ id, label, icon, error, hint, className, rows = 4, ...props }, ref) => (
    <FieldShell id={id} label={label} icon={icon} error={error} hint={hint} multiline>
      <textarea
        ref={ref}
        id={id}
        name={props.name ?? id}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(fieldControlClass, "h-auto resize-none pt-7 pb-3", className)}
        {...props}
      />
    </FieldShell>
  ),
);
Textarea.displayName = "Textarea";
