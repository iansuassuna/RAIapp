"use client";

import { LogOut, Monitor } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, ConfirmButton } from "@/components/ui";
import type { ProfileSession } from "@/lib/api/profile";
import { describeUserAgent, formatDateTime, formatIpAddress } from "@/lib/format";
import { revokeOtherSessionsAction } from "../actions";

function ipLabel(ip: string | null) {
  const formatted = formatIpAddress(ip);
  return formatted ? ` · IP ${formatted}` : "";
}

export function ActiveSessions({ sessions }: { sessions: ProfileSession[] }) {
  const [error, setError] = useState<string | null>(null);
  const others = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <ul className="divide-y divide-line/70">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Monitor className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-950">
                {describeUserAgent(s.userAgent)}
                {s.current && <Badge tone="accent">Este aparelho</Badge>}
              </span>
              <span className="block text-xs text-ink-subtle">
                Último acesso {formatDateTime(s.lastActiveAt)}
                {ipLabel(s.ipAddress)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {others > 0 ? (
        <div className="flex justify-end">
          <ConfirmButton
            confirmLabel={`Encerrar ${others} ${others === 1 ? "sessão" : "sessões"}`}
            onConfirm={async () => {
              setError(null);
              const result = await revokeOtherSessionsAction();
              if (!result.ok) setError(result.error);
            }}
          >
            <LogOut className="size-4" aria-hidden /> Sair dos outros aparelhos
          </ConfirmButton>
        </div>
      ) : (
        <p className="text-xs text-ink-subtle">Nenhuma outra sessão aberta.</p>
      )}
    </div>
  );
}
