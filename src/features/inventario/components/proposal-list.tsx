import { ArrowRight, FilePen, FilePlus2, FileX2, type LucideIcon } from "lucide-react";
import { Badge, Card, DecisionForm, EmptyState, SectionTitle } from "@/components/ui";
import { eixoLabel } from "@/config/options";
import { cabinetLabel } from "@/config/requests";
import { formatDateTime } from "@/lib/format";
import type { InventoryItem, InventoryProposal } from "@/types";
import { resolveProposalAction } from "../actions";

const ACTION: Record<InventoryProposal["action"], { label: string; icon: LucideIcon }> = {
  criar: { label: "Novo item", icon: FilePlus2 },
  editar: { label: "Alteração", icon: FilePen },
  excluir: { label: "Exclusão", icon: FileX2 },
};
const STATUS = {
  pendente: { label: "Aguardando aprovação", tone: "warning" },
  aplicada: { label: "Aplicada", tone: "success" },
  recusada: { label: "Recusada", tone: "danger" },
} as const;

type Props = {
  proposals: InventoryProposal[];
  items: Record<string, InventoryItem>;
  memberNames: Record<string, string>;
  title: string;
  /** Mostra aprovar/recusar (Painel da Coordenação). */
  canDecide?: boolean;
  emptyText?: string;
};

function describe(item: Pick<InventoryItem, "name" | "category" | "cabinet" | "ownerEixo" | "total">) {
  return `${item.name} · ${item.category} · ${cabinetLabel(item.cabinet)} · ${item.ownerEixo ? eixoLabel(item.ownerEixo) : "sem propriedade"} · ${item.total} un.`;
}

/** Diferenças campo a campo de uma proposta de edição. */
function changes(before: InventoryItem, after: NonNullable<InventoryProposal["data"]>) {
  const out: string[] = [];
  if (before.name !== after.name) out.push(`nome: ${before.name} → ${after.name}`);
  if (before.category !== after.category) out.push(`categoria: ${before.category} → ${after.category}`);
  if (before.cabinet !== after.cabinet) out.push(`${cabinetLabel(before.cabinet)} → ${cabinetLabel(after.cabinet)}`);
  if (before.ownerEixo !== after.ownerEixo)
    out.push(
      `dono: ${before.ownerEixo ? eixoLabel(before.ownerEixo) : "sem propriedade"} → ${after.ownerEixo ? eixoLabel(after.ownerEixo) : "sem propriedade"}`,
    );
  if (before.total !== after.total) out.push(`quantidade: ${before.total} → ${after.total}`);
  return out.length ? out : ["sem mudanças"];
}

/** Alterações de inventário propostas pelo time Processos. */
export function ProposalList({ proposals, items, memberNames, title, canDecide, emptyText }: Props) {
  if (proposals.length === 0 && !emptyText) return null;
  return (
    <section aria-labelledby="propostas" className="space-y-3">
      <SectionTitle id="propostas">
        {title} ({proposals.length})
      </SectionTitle>
      <Card className="p-2">
        {proposals.length === 0 ? (
          <EmptyState icon={FilePen} title={emptyText!} />
        ) : (
          <ul className="divide-y divide-line/70">
            {proposals.map((p) => {
              const { label, icon: Icon } = ACTION[p.action];
              const item = p.itemId ? items[p.itemId] : undefined;
              const lines =
                p.action === "criar"
                  ? [describe(p.data!)]
                  : p.action === "excluir"
                    ? [item ? describe(item) : "Item removido"]
                    : item
                      ? changes(item, p.data!)
                      : ["Item removido"];
              return (
                <li key={p.id} className="space-y-3 px-3 py-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-50 text-warning-700">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-brand-950">
                        {label}
                        {item && p.action !== "criar" && <>: {item.name}</>}
                      </span>
                      <span className="block text-xs text-ink-subtle">
                        {memberNames[p.proposerId] ?? "—"} (Processos) · {formatDateTime(p.createdAt)}
                      </span>
                    </span>
                    <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                  </div>
                  <ul className="space-y-1 rounded-field bg-surface-muted/60 px-3 py-2 text-sm text-ink">
                    {lines.map((l) => (
                      <li key={l} className="flex items-start gap-2">
                        <ArrowRight className="mt-1 size-3 shrink-0 text-ink-subtle" aria-hidden /> {l}
                      </li>
                    ))}
                  </ul>
                  {p.resolution && (
                    <p className="pl-1 text-xs text-ink-subtle">
                      {p.status === "aplicada" ? "Aprovada" : "Recusada"} por {memberNames[p.resolution.by] ?? "—"}
                      {p.resolution.note && <>: “{p.resolution.note}”</>}
                    </p>
                  )}
                  {canDecide && p.status === "pendente" && (
                    <DecisionForm
                      action={resolveProposalAction.bind(null, p.id)}
                      approve={{ value: "aplicada", label: "Aprovar e aplicar" }}
                      reject={{ value: "recusada", label: "Recusar" }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
