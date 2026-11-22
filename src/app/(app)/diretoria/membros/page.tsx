import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { MemberRoleList } from "@/features/diretoria";
import { getAllMembers } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Membros e papéis · Diretoria" };

/** Gestão de papéis e vínculos (eixo/time) dos membros — exclusiva da diretoria. */
export default async function DirectorMembersPage() {
  const member = await getCurrentMember();
  const members = await getAllMembers(member);
  if (!members) forbidden();

  return (
    <div className="max-w-3xl">
      <MemberRoleList members={members} currentMemberId={member.id} />
    </div>
  );
}
