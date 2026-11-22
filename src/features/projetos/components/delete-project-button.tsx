"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui";
import type { ActionResult } from "@/types";

export function DeleteProjectButton({
  action,
  redirectTo,
}: {
  action: () => Promise<ActionResult>;
  redirectTo: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      confirmLabel="Excluir projeto"
      onConfirm={async () => {
        const result = await action();
        if (result.ok) router.push(redirectTo);
      }}
    >
      <Trash2 className="size-4" aria-hidden /> Excluir
    </ConfirmButton>
  );
}
