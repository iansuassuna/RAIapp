import { PROGRESS_LABEL, PROGRESS_TONE, REQUEST_KIND_LABEL, requestDeadline, requestTitle } from "@/config/requests";
import type { DeadlineRow, ResourceRequest } from "@/types";

type Names = {
  components: Record<string, { name: string }>;
  projectNames: Record<string, string>;
  memberNames: Record<string, string>;
};

/** Converte requisições com prazo em linhas para "Prazos e tarefas" e para as tarefas do projeto. */
export function requestsToDeadlineRows(
  requests: ResourceRequest[],
  names: Names,
  opts: { viewerId?: string; href?: (r: ResourceRequest) => string } = {},
): DeadlineRow[] {
  return requests.flatMap((r): DeadlineRow[] => {
    const deadline = requestDeadline(r);
    if (!deadline || !r.progress) return [];
    const who = r.memberId === opts.viewerId ? "você pediu" : `pedido por ${names.memberNames[r.memberId] ?? "—"}`;
    const project = r.projectId ? ` · ${names.projectNames[r.projectId] ?? ""}` : "";
    return [
      {
        id: r.id,
        title: requestTitle(r, (id) => names.components[id]?.name ?? "Componente"),
        subtitle: `${REQUEST_KIND_LABEL[r.kind]} · ${who}${project}`,
        deadline,
        badge: { label: PROGRESS_LABEL[r.progress], tone: PROGRESS_TONE[r.progress] },
        href: opts.href?.(r),
      },
    ];
  });
}
