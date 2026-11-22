import { Plus, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui";
import { InventoryBrowser, ProposalList } from "@/features/inventario";
import { assignableOwners, canProposeInventoryChange } from "@/lib/access";
import { getInventory, getLookups, getMyProposals } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";
import type { InventoryItem } from "@/types";

export const metadata: Metadata = { title: "Inventário" };

/** Inventário do RAITec: todos veem tudo; coordenação/diretoria alteram; time Processos propõe. */
export default async function InventoryPage() {
  const member = await getCurrentMember();
  const [items, proposals, { memberNames }] = await Promise.all([getInventory(), getMyProposals(member), getLookups()]);
  const proposes = canProposeInventoryChange(member);
  const edits = !proposes && assignableOwners(member).length > 0;
  const byId = Object.fromEntries(items.map((i) => [i.id, i as InventoryItem]));

  return (
    <div className="space-y-8 pt-7">
      <PageHeader
        eyebrow="Componentes do RAITec, de todos os eixos"
        title="Inventário"
        actions={
          edits ? (
            <Link href="/inventario/novo" className={buttonVariants()}>
              <Plus className="size-4" aria-hidden /> Novo item
            </Link>
          ) : proposes ? (
            <Link href="/inventario/novo" className={buttonVariants({ variant: "secondary" })}>
              <Send className="size-4" aria-hidden /> Propor novo item
            </Link>
          ) : undefined
        }
      />
      <InventoryBrowser items={items} />
      {proposes && (
        <ProposalList
          title="Minhas propostas"
          proposals={proposals}
          items={byId}
          memberNames={memberNames}
          emptyText="Você ainda não propôs alterações"
        />
      )}
    </div>
  );
}
