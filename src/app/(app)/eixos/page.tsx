import { redirect } from "next/navigation";
import { getAccessibleEixos } from "@/lib/access";
import { getCurrentMember } from "@/lib/session";

/** /eixos leva direto ao eixo do membro (diretoria, que não tem eixo, vai para o primeiro). */
export default async function EixosIndexPage() {
  const member = await getCurrentMember();
  redirect(`/eixos/${member.eixo ?? getAccessibleEixos(member)[0]}`);
}
