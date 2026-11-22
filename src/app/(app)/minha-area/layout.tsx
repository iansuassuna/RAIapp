import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SectionTabs } from "@/components/ui";
import { hasMemberArea } from "@/lib/access";
import { getCurrentMember } from "@/lib/session";

export default async function MemberAreaLayout({ children }: { children: React.ReactNode }) {
  // Diretoria não tem eixo, projetos nem faz requisições: a área dela é /diretoria.
  if (!hasMemberArea(await getCurrentMember())) redirect("/diretoria");

  return (
    <div className="space-y-6 pt-7">
      <PageHeader eyebrow="Seus projetos, prazos e pedidos" title="Minha área" />
      <SectionTabs
        label="Seções da minha área"
        tabs={[
          { href: "/minha-area", label: "Projetos e tarefas", exact: true },
          { href: "/minha-area/requisicoes", label: "Requisições" },
        ]}
      />
      <div className="pt-2">{children}</div>
    </div>
  );
}
