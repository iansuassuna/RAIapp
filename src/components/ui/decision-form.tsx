"use client";

import { Check, X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import type { ActionResult } from "@/types";
import { Alert } from "./alert";
import { Button } from "./button";

type Props = {
  /** Server Action já vinculada ao item; recebe { decision, note }. */
  action: (input: unknown) => Promise<ActionResult>;
  approve?: { value: string; label: string };
  reject?: { value: string; label: string };
};

/** Aprovar ou recusar com observação (obrigatória ao recusar). Usado em requisições e propostas. */
export function DecisionForm({
  action,
  approve = { value: "aprovada", label: "Aprovar" },
  reject = { value: "recusada", label: "Recusar" },
}: Props) {
  const id = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState<string | null>(null);

  function submit(next: string) {
    setDecision(next);
    setError(null);
    startTransition(async () => {
      const result = await action({ decision: next, note });
      if (!result.ok) setError(result.fieldErrors?.note ?? result.error);
    });
  }

  return (
    <div className="space-y-2 rounded-field bg-surface-muted/60 p-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <label className="sr-only" htmlFor={id}>
        Observação para quem pediu
      </label>
      <textarea
        id={id}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="Observação para quem pediu (obrigatória ao recusar)"
        className="w-full resize-none rounded-lg bg-surface px-3 py-2 text-sm text-ink ring-1 ring-line placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-500"
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={pending && decision === reject.value}
          disabled={pending}
          onClick={() => submit(reject.value)}
        >
          <X className="size-4" aria-hidden /> {reject.label}
        </Button>
        <Button
          type="button"
          size="sm"
          loading={pending && decision === approve.value}
          disabled={pending}
          onClick={() => submit(approve.value)}
        >
          <Check className="size-4" aria-hidden /> {approve.label}
        </Button>
      </div>
    </div>
  );
}
