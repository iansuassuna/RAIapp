import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui";
import { ownerSelectOptions } from "@/config/options";
import { InventoryForm } from "@/features/inventario";
import { createInventoryItemAction } from "@/features/inventario/actions";
import { assignableOwners, canProposeInventoryChange } from "@/lib/access";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Novo item" };

export default async function NewInventoryItemPage() {
  const member = await getCurrentMember();
  const owners = assignableOwners(member);
  if (owners.length === 0) forbidden();
  const asProposal = canProposeInventoryChange(member);

  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-7">
      <SectionTitle>{asProposal ? "Propor novo item" : "Novo item no inventário"}</SectionTitle>
      <Card>
        <InventoryForm
          action={createInventoryItemAction}
          ownerOptions={ownerSelectOptions(owners)}
          cancelHref="/inventario"
          asProposal={asProposal}
        />
      </Card>
    </div>
  );
}
