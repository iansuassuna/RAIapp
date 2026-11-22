"use client";

import { FlaskConical } from "lucide-react";
import { describeMember, ROLE_LABEL } from "@/config/options";
import { devQuickSwitchAction } from "@/lib/auth-actions";
import type { Member, Role } from "@/types";

const ROLE_ORDER: Role[] = ["diretoria", "coordenador", "membro"];

/**
 * Seletor rápido de usuário em desenvolvimento (`DEV_QUICK_SWITCH=true`).
 * Cria uma sessão real do Better Auth no banco para o usuário selecionado.
 */
export function DevMemberSwitcher({ current, members }: { current: Member; members: Member[] }) {
  if (members.length === 0) return null;

  return (
    <form action={devQuickSwitchAction} className="rounded-xl bg-warning-50 px-3 py-2.5">
      <label htmlFor="dev-member" className="flex items-center gap-2 text-xs font-semibold text-warning-700">
        <FlaskConical className="size-3.5" aria-hidden /> Troca rápida (dev)
      </label>
      <select
        id="dev-member"
        name="memberId"
        defaultValue={current.id}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-1.5 h-9 w-full cursor-pointer rounded-lg bg-surface px-2 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-accent-500"
      >
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
      <noscript>
        <button type="submit" className="mt-2 text-xs font-semibold text-warning-700 underline">
          Trocar
        </button>
      </noscript>
    </form>
  );
}
