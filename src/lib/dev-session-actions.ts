"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { mockMembers } from "./mock-data";
import { DEV_MEMBER_COOKIE } from "./session";

/** Troca o membro de teste. TEMPORÁRIO — remover junto com o DevMemberSwitcher quando houver login real. */
export async function switchDevMember(formData: FormData) {
  const id = String(formData.get("memberId") ?? "");
  if (!mockMembers.some((m) => m.id === id)) return;
  (await cookies()).set(DEV_MEMBER_COOKIE, id, { path: "/", sameSite: "lax", httpOnly: true });
  redirect("/dashboard");
}
