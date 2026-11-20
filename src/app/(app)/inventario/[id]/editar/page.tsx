import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { Card, SectionTitle } from "@/components/ui";
import { ownerSelectOptions } from "@/config/options";
import { InventoryForm } from "@/features/inventario";
import { updateInventoryItemAction } from "@/features/inventario/actions";
import { assignableOwners, canEditInventoryItem, canProposeInventoryChange } from "@/lib/access";
import { getInventoryItem } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

export const metadata: Metadata = { title: "Editar item" };

export default async function EditInventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getInventoryItem(id);
  if (!item) notFound();
  const member = await getCurrentMember();
  const edits = canEditInventoryItem(member, item);
  const proposes = !edits && canProposeInventoryChange(member);
  if (!edits && !proposes) forbidden();

  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-7">
      <SectionTitle>
        {proposes ? "Propor alteração" : "Editar"} · {item.name}
      </SectionTitle>
      <Card>
        <InventoryForm
          action={updateInventoryItemAction.bind(null, item.id)}
          item={item}
          ownerOptions={ownerSelectOptions(assignableOwners(member))}
          cancelHref={`/inventario/${item.id}`}
          asProposal={proposes}
        />
      </Card>
    </div>
  );
}
