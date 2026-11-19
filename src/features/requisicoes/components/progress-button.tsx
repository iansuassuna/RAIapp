"use client";

import { ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, Button } from "@/components/ui";
import type { ActionResult } from "@/types";

/** Avança o andamento da requisição (ex.: "Marcar liberada"). `action` já vinculada ao destino. */
export function ProgressButton({ action, label }: { action: () => Promise<ActionResult>; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-end gap-2">
      {error && <Alert tone="danger">{error}</Alert>}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            setError(result.ok ? null : result.error);
          })
        }
      >
        {label} <ArrowRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
