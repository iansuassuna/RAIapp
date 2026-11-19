import { Cpu, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { REQUEST_KIND_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE } from "@/config/options";
import { formatDateTime } from "@/lib/format";
import type { ResourceRequest } from "@/types";

type Props = {
  request: ResourceRequest;
  /** Nome do componente (quando kind = componente). */
  componentName?: string;
  projectName?: string;
  requesterName?: string;
  resolverName?: string;
  /** Conteúdo extra (ex.: formulário de resolução da coordenação). */
  children?: ReactNode;
};

/** Item de requisição usado na lista do membro e na fila da coordenação. */
export function RequestItem({ request, componentName, projectName, requesterName, resolverName, children }: Props) {
  const Icon = request.kind === "componente" ? Cpu : Wrench;
  const title = request.kind === "componente" ? `${componentName ?? "Componente"} ×${request.quantity}` : request.description;

  return (
    <li className="space-y-3 px-3 py-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-brand-950">{title}</span>
          <span className="block text-xs text-ink-subtle">
            {REQUEST_KIND_LABEL[request.kind]}
            {requesterName && <> · {requesterName}</>}
            {projectName && <> · {projectName}</>} · {formatDateTime(request.createdAt)}
          </span>
        </span>
        <Badge tone={REQUEST_STATUS_TONE[request.status]}>{REQUEST_STATUS_LABEL[request.status]}</Badge>
      </div>
      <p className="rounded-field bg-surface-muted/60 px-3 py-2 text-sm text-ink-muted">{request.justification}</p>
      {request.resolution && (
        <p className="pl-1 text-xs text-ink-subtle">
          {request.status === "aprovada" ? "Aprovada" : "Recusada"}
          {resolverName && <> por {resolverName}</>} em {formatDateTime(request.resolution.at)}
          {request.resolution.note && <>: “{request.resolution.note}”</>}
        </p>
      )}
      {children}
    </li>
  );
}
