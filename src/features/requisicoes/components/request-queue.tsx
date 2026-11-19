import { CheckCircle2, Inbox } from "lucide-react";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import type { ResourceRequest } from "@/types";
import { resolveRequestAction } from "../actions";
import { RequestItem } from "./request-item";
import { ResolveRequestForm } from "./resolve-request-form";

type Props = {
  requests: ResourceRequest[];
  componentNames: Record<string, string>;
  projectNames: Record<string, string>;
  memberNames: Record<string, string>;
  /** Vínculo de cada membro ("Coordenação · Inovação"), exibido ao lado do nome de quem pediu. */
  memberContexts?: Record<string, string>;
  /** Mostrar o vínculo de quem pediu (útil na fila da diretoria, que reúne vários eixos). */
  showRequesterContext?: boolean;
};

/** Fila da coordenação: pendentes (com aprovar/recusar) e histórico. */
export function RequestQueue({ requests, componentNames, projectNames, memberNames, memberContexts = {}, showRequesterContext }: Props) {
  const pending = requests.filter((r) => r.status === "pendente");
  const history = requests.filter((r) => r.status !== "pendente");
  const item = (r: ResourceRequest, withForm: boolean) => (
    <RequestItem
      key={r.id}
      request={r}
      componentName={r.componentId ? componentNames[r.componentId] : undefined}
      projectName={r.projectId ? projectNames[r.projectId] : undefined}
      requesterName={
        showRequesterContext && memberContexts[r.memberId]
          ? `${memberNames[r.memberId]} (${memberContexts[r.memberId]})`
          : memberNames[r.memberId]
      }
      resolverName={r.resolution ? memberNames[r.resolution.by] : undefined}
    >
      {withForm && <ResolveRequestForm action={resolveRequestAction.bind(null, r.id)} />}
    </RequestItem>
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="pendentes" className="space-y-3">
        <SectionTitle id="pendentes">Pendentes ({pending.length})</SectionTitle>
        <Card className="p-2">
          {pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tudo em dia">
              Nenhuma requisição aguardando análise.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line/70">{pending.map((r) => item(r, true))}</ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="historico" className="space-y-3">
        <SectionTitle id="historico">Histórico</SectionTitle>
        <Card className="p-2">
          {history.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhuma requisição resolvida ainda" />
          ) : (
            <ul className="divide-y divide-line/70">{history.map((r) => item(r, false))}</ul>
          )}
        </Card>
      </section>
    </div>
  );
}
