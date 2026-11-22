import { Banknote, Cpu, Ellipsis, KeyRound, type LucideIcon, Send, ShoppingCart, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { eixoLabel, REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE } from "@/config/options";
import {
  cabinetLabel,
  formatBRL,
  PROGRESS_LABEL,
  PROGRESS_TONE,
  REQUEST_KIND_LABEL,
  requestTitle,
  roomLabel,
} from "@/config/requests";
import { formatDateTime, formatShortDate } from "@/lib/format";
import type { InventoryItem, RequestKind, ResourceRequest } from "@/types";

const KIND_ICON: Record<RequestKind, LucideIcon> = {
  componente: Cpu,
  reuniao: Users,
  autorizacao: KeyRound,
  verba: Banknote,
  compra: ShoppingCart,
  outros: Ellipsis,
  pedido: Send,
};

export type RequestLookups = {
  components: Record<string, Pick<InventoryItem, "name" | "cabinet" | "ownerEixo">>;
  projectNames: Record<string, string>;
  memberNames: Record<string, string>;
  memberContexts: Record<string, string>;
};

/** Linha de detalhes específica do tipo. */
function details(r: ResourceRequest, lookups: RequestLookups): string | null {
  switch (r.kind) {
    case "componente": {
      const c = lookups.components[r.componentId];
      return c
        ? `${cabinetLabel(c.cabinet)} · ${c.ownerEixo ? `do eixo ${eixoLabel(c.ownerEixo)}` : "sem propriedade"}`
        : null;
    }
    case "reuniao":
      return `${formatShortDate(r.date)} às ${r.time} · ${roomLabel(r.room)}`;
    case "autorizacao":
      return `De ${formatShortDate(r.startDate)} até ${formatShortDate(r.endDate)}`;
    case "verba":
      return `${r.usage} · prazo ${formatShortDate(r.deadline)}`;
    case "compra":
      return r.purchase
        ? `Comprado por ${formatBRL(r.purchase.paidValue)} (estimado ${formatBRL(r.estimatedValue)})`
        : `Estimado ${formatBRL(r.estimatedValue)} · prazo ${formatShortDate(r.deadline)}`;
    case "outros":
      return r.date ? `Prazo ${formatShortDate(r.date)}` : null;
    case "pedido":
      return null;
  }
}

/** Texto principal além do título (explicação do "outros"/"pedido"). */
function body(r: ResourceRequest): string | null {
  if (r.kind === "pedido") return r.explanation;
  if (r.kind === "outros" && r.explanation.length > 60) return r.explanation;
  return null;
}

type Props = {
  request: ResourceRequest;
  lookups: RequestLookups;
  /** Mostra quem pediu (filas da coordenação/diretoria). */
  showRequester?: boolean;
  /** Ações do painel (aprovar, avançar, concluir compra…). */
  children?: ReactNode;
};

/** Item de requisição: título, tipo, detalhes do tipo, status e andamento. */
export function RequestItem({ request: r, lookups, showRequester, children }: Props) {
  const Icon = KIND_ICON[r.kind];
  const title = requestTitle(r, (id) => lookups.components[id]?.name ?? "Componente removido");
  const line = details(r, lookups);
  const text = body(r);
  const requester = lookups.memberNames[r.memberId];
  const context = lookups.memberContexts[r.memberId];

  return (
    <li className="space-y-3 px-3 py-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-brand-950">{title}</span>
          <span className="block text-xs text-ink-subtle">
            {REQUEST_KIND_LABEL[r.kind]}
            {showRequester && requester && (
              <>
                {" "}
                · {requester}
                {context && ` (${context})`}
              </>
            )}
            {r.projectId && lookups.projectNames[r.projectId] && <> · {lookups.projectNames[r.projectId]}</>} ·{" "}
            {formatDateTime(r.createdAt)}
          </span>
          {line && <span className="mt-0.5 block text-xs font-medium text-ink-muted">{line}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {r.progress ? (
            <Badge tone={PROGRESS_TONE[r.progress]}>{PROGRESS_LABEL[r.progress]}</Badge>
          ) : (
            <Badge tone={REQUEST_STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
          )}
        </span>
      </div>
      {text && <p className="rounded-field bg-surface-muted/60 px-3 py-2 text-sm text-ink">{text}</p>}
      <p className="rounded-field bg-surface-muted/60 px-3 py-2 text-sm text-ink-muted">
        <span className="font-semibold text-ink">Justificativa: </span>
        {r.justification}
      </p>
      {r.resolution && (
        <p className="pl-1 text-xs text-ink-subtle">
          {r.status === "aprovada" ? "Aprovada" : "Recusada"} por {lookups.memberNames[r.resolution.by] ?? "—"} em{" "}
          {formatDateTime(r.resolution.at)}
          {r.resolution.note && <>: “{r.resolution.note}”</>}
        </p>
      )}
      {children}
    </li>
  );
}
