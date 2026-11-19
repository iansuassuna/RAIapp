"use client";

import { Check, X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Alert, Button } from "@/components/ui";
import type { ActionResult } from "@/types";

/** Aprovar ou recusar uma requisição (coordenação). A recusa exige um motivo. */
export function ResolveRequestForm({ action }: { action: (input: unknown) => Promise<ActionResult> }) {
  const id = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState<"aprovada" | "recusada" | null>(null);

  function submit(next: "aprovada" | "recusada") {
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
        <Button type="button" variant="danger" size="sm" loading={pending && decision === "recusada"} disabled={pending} onClick={() => submit("recusada")}>
          <X className="size-4" aria-hidden /> Recusar
        </Button>
        <Button type="button" size="sm" loading={pending && decision === "aprovada"} disabled={pending} onClick={() => submit("aprovada")}>
          <Check className="size-4" aria-hidden /> Aprovar
        </Button>
      </div>
    </div>
  );
}
