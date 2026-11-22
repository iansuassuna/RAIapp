import { ChevronDown, type LucideIcon } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FieldShell, fieldControlClass } from "./field";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  icon: LucideIcon;
  placeholder: string;
  options: { value: string; label: string; disabled?: boolean }[];
  /** Permite escolher o placeholder como valor vazio (ex.: "Sem responsável"). */
  placeholderSelectable?: boolean;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  (
    { id, label, icon, placeholder, options, error, className, defaultValue = "", placeholderSelectable, ...props },
    ref,
  ) => (
    <FieldShell
      id={id}
      label={label}
      icon={icon}
      error={error}
      trailing={<ChevronDown aria-hidden className="pointer-events-none mr-2 size-[18px] text-ink-subtle" />}
    >
      <select
        ref={ref}
        id={id}
        name={props.name ?? id}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          fieldControlClass,
          "appearance-none pr-12 invalid:text-ink-subtle/80 [&>option]:text-ink",
          className,
        )}
        {...props}
      >
        <option value="" disabled={!placeholderSelectable}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  ),
);
Select.displayName = "Select";
