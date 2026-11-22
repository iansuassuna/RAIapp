"use client";

import { FlaskConical } from "lucide-react";
import { describeMember, ROLE_LABEL } from "@/config/options";
import { devQuickSwitchAction } from "@/lib/auth-actions";
import type { Member, Role } from "@/types";

const ROLE_ORDER: Role[] = ["diretoria", "coordenador", "membro"];

/**
 * Acesso rápido em modo desenvolvimento (`DEV_QUICK_SWITCH=true`).
 * Cria uma sessão real do Better Auth para o usuário selecionado.
 */
export function DevQuickLogin({ members }: { members: Member[] }) {
  if (members.length === 0) return null;

  return (
    <form
      action={devQuickSwitchAction}
      className="mt-6 rounded-card border border-warning-500/30 bg-warning-50 p-4 text-left"
    >
      <label htmlFor="dev-login-member" className="flex items-center gap-2 text-xs font-semibold text-warning-700">
        <FlaskConical className="size-3.5" aria-hidden /> Acesso rápido (DEV_QUICK_SWITCH)
      </label>
      <p className="mt-1 text-xs text-warning-700/90">
        Selecione um usuário do banco para iniciar uma sessão real sem digitar senha.
      </p>
      <select
        id="dev-login-member"
        name="memberId"
        defaultValue=""
        onChange={(e) => {
          if (e.currentTarget.value) e.currentTarget.form?.requestSubmit();
        }}
        className="mt-2 h-11 w-full cursor-pointer rounded-field bg-surface px-3 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-accent-500"
      >
        <option value="" disabled>
          Escolher usuário para entrar…
        </option>
        {ROLE_ORDER.map((role) => {
          const group = members.filter((m) => m.role === role);
          if (group.length === 0) return null;
          return (
            <optgroup key={role} label={ROLE_LABEL[role]}>
              {group.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {describeMember(m)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </form>
  );
}
