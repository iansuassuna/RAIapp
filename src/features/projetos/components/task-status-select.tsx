"use client";

import { useState, useTransition } from "react";
import { TASK_STATUS_LABEL, TASK_STATUSES } from "@/config/options";
import { cn } from "@/lib/cn";
import type { ActionResult, TaskStatus } from "@/types";

const tone: Record<TaskStatus, string> = {
  "a-fazer": "bg-brand-50 text-brand-700",
  "em-andamento": "bg-warning-50 text-warning-700",
  concluida: "bg-success-50 text-success-700",
};

/** Seletor de status de tarefa com o visual do Badge. `action` = Server Action já vinculada à tarefa. */
export function TaskStatusSelect({
  status,
  label,
  action,
}: {
  status: TaskStatus;
  label: string;
  action: (status: TaskStatus) => Promise<ActionResult>;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={label}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as TaskStatus;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const result = await action(next);
          if (!result.ok) setValue(previous);
        });
      }}
      className={cn(
        "h-8 shrink-0 cursor-pointer appearance-none rounded-full px-3 text-center text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:opacity-60",
        tone[value],
      )}
    >
      {TASK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {TASK_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
