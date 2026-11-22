"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, ConfirmButton } from "@/components/ui";
import type { ActionResult } from "@/types";

/** Excluir item (ou propor exclusão, para o time Processos). */
export function DeleteItemButton({ action, asProposal }: { action: () => Promise<ActionResult>; asProposal: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <ConfirmButton
        confirmLabel={asProposal ? "Propor exclusão" : "Excluir item"}
        onConfirm={async () => {
          const result = await action();
          if (!result.ok) setMessage({ tone: "danger", text: result.error });
          else if (result.pending)
            setMessage({ tone: "success", text: "Proposta de exclusão enviada para aprovação." });
          else router.push("/inventario");
        }}
      >
        <Trash2 className="size-4" aria-hidden /> {asProposal ? "Propor exclusão" : "Excluir"}
      </ConfirmButton>
    </div>
  );
}
