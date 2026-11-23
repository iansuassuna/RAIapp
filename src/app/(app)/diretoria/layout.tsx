import { forbidden } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SectionTabs } from "@/components/ui";
import { canReviewDirectorRequests } from "@/lib/access";
import { countPendingRequests } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

/** Área da diretoria: pedidos das coordenações, papéis/pontuação dos membros e ciclos de avaliação. */
export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!canReviewDirectorRequests(member)) forbidden();

  const pending = await countPendingRequests({ reviewer: "diretoria" });

  return (
    <div className="space-y-6 pt-7">
      <PageHeader eyebrow="Gestão geral do RAITec" title="Diretoria" />
      <SectionTabs
        label="Seções da diretoria"
        tabs={[
          { href: "/diretoria", label: "Pedidos das coordenações", shortLabel: "Pedidos", exact: true, count: pending },
          { href: "/diretoria/membros", label: "Membros e papéis", shortLabel: "Membros" },
          { href: "/diretoria/ciclos", label: "Ciclos de avaliação", shortLabel: "Ciclos" },
        ]}
      />
      <div className="pt-2">{children}</div>
    </div>
  );
}
