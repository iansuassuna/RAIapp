"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isDevQuickSwitchEnabled } from "@/lib/dev-auth";

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Troca rápida de usuário em desenvolvimento (`DEV_QUICK_SWITCH=true` e `NODE_ENV !== "production"`).
 * Cria uma sessão REAL do Better Auth no PostgreSQL e grava o cookie oficial assinado.
 */
export async function devQuickSwitchAction(formData: FormData) {
  if (!isDevQuickSwitchEnabled()) return;
  const userId = String(formData.get("memberId") ?? "").trim();
  if (!userId) return;

  const reqHeaders = await headers();
  try {
    await auth.api.signOut({ headers: reqHeaders });
  } catch {
    // Sem sessão ativa anteriormente.
  }

  const api = auth.api as typeof auth.api & {
    devQuickSwitch: (opts: { body: { userId: string }; headers: Headers }) => Promise<unknown>;
  };

  try {
    await api.devQuickSwitch({ body: { userId }, headers: reqHeaders });
  } catch {
    return;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
