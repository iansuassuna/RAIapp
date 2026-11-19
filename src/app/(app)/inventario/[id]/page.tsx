import { Archive, ArrowLeft, Layers, Pencil, Send, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, buttonVariants, Card, Progress } from "@/components/ui";
import { eixoLabel } from "@/config/options";
import { cabinetLabel } from "@/config/requests";
import { DeleteItemButton, ItemUsage } from "@/features/inventario";
import { deleteInventoryItemAction } from "@/features/inventario/actions";
import { canEditInventoryItem, canProposeInventoryChange } from "@/lib/access";
import { getInventoryItem, getInventoryUsage, getLookups } from "@/lib/api";
import { getCurrentMember } from "@/lib/session";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getInventoryItem((await params).id);
  return { title: item?.name ?? "Item" };
}

export default async function InventoryItemPage({ params }: Props) {
  const { id } = await params;
  const item = await getInventoryItem(id);
  if (!item) notFound();
  const member = await getCurrentMember();
  const [usage, { memberNames }] = await Promise.all([getInventoryUsage(id), getLookups()]);
  const edits = canEditInventoryItem(member, item);
  const proposes = !edits && canProposeInventoryChange(member);

  return (
    <div className="space-y-6 pt-7">
      <Link href="/inventario" className={buttonVariants({ variant: "link", className: "gap-1.5" })}>
        <ArrowLeft className="size-4" aria-hidden /> Inventário
      </Link>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-brand-950">{item.name}</h1>
            <Badge tone={item.ownerEixo ? "brand" : "accent"} dot={false}>
              {item.ownerEixo ? eixoLabel(item.ownerEixo) : "Sem propriedade"}
            </Badge>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            {[
              { icon: Tag, label: "Categoria", value: item.category },
              { icon: Archive, label: "Armário", value: cabinetLabel(item.cabinet) },
              { icon: Layers, label: "Dono", value: item.ownerEixo ? eixoLabel(item.ownerEixo) : "Ninguém" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-field bg-surface-muted/60 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Icon className="size-3.5" aria-hidden /> {label}
                </dt>
                <dd className="font-semibold text-brand-950">{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm tabular-nums">
              <span className="text-ink-muted">{item.inUse} em uso</span>
              <span className="font-display font-bold text-iris-600">
                {item.available}
                <span className="text-xs font-medium text-ink-subtle">/{item.total} livres</span>
              </span>
            </div>
            <Progress value={item.available} max={Math.max(item.total, 1)} tone="light" label="Unidades livres" />
          </div>
          {(edits || proposes) && (
            <div className="flex flex-wrap items-start justify-end gap-2 border-t border-line pt-4">
              <Link href={`/inventario/${item.id}/editar`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                {proposes ? <Send className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
                {proposes ? "Propor alteração" : "Editar"}
              </Link>
              <DeleteItemButton action={deleteInventoryItemAction.bind(null, item.id)} asProposal={proposes} />
            </div>
          )}
        </Card>
        <ItemUsage projects={usage.projects} loans={usage.loans} memberNames={memberNames} />
      </div>
    </div>
  );
}
