import { CheckCircle2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, DecisionForm, EmptyState, SectionTitle } from "@/components/ui";
import { FINAL_PROGRESS, NEXT_PROGRESS } from "@/config/requests";
import type { RequestKind, ResourceRequest } from "@/types";
import { advanceRequestAction, completePurchaseAction, resolveRequestAction } from "../actions";
import { ProgressButton } from "./progress-button";
import { PurchaseCompleteForm } from "./purchase-complete-form";
import { RequestItem, type RequestLookups } from "./request-item";

type Props = {
  requests: ResourceRequest[];
  lookups: RequestLookups;
  /** "eixo" = Painel da Coordenação (requisições dos membros); "diretoria" = pedidos dos coordenadores. */
  mode: "eixo" | "diretoria";
  /** Eixos que podem ser donos de itens comprados (para o formulário de compra feita). */
  ownerOptions?: { value: string; label: string }[];
  /** Eixo padrão do item comprado. */
  defaultOwner?: string;
};

/** Seções do painel em andamento, na ordem em que aparecem. */
const IN_PROGRESS: { id: string; title: string; kinds: RequestKind[] }[] = [
  { id: "compras", title: "Compras aguardando", kinds: ["compra"] },
  { id: "verbas", title: "Verbas", kinds: ["verba"] },
  { id: "autorizacoes", title: "Autorizações ativas", kinds: ["autorizacao"] },
  { id: "reunioes", title: "Reuniões agendadas", kinds: ["reuniao"] },
  { id: "componentes", title: "Componentes em uso", kinds: ["componente"] },
  { id: "outros", title: "Outros em andamento", kinds: ["outros"] },
  { id: "pedidos", title: "Aguardando entrega", kinds: ["pedido"] },
];

function Section({ id, title, count, icon, empty, children }: { id: string; title: string; count: number; icon?: LucideIcon; empty?: string; children: ReactNode }) {
  if (count === 0 && !empty) return null;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionTitle id={id}>
        {title} ({count})
      </SectionTitle>
      <Card className="p-2">
        {count === 0 ? <EmptyState icon={icon ?? CheckCircle2} title={empty!} /> : <ul className="divide-y divide-line/70">{children}</ul>}
      </Card>
    </section>
  );
}

/** Requisições do painel: para analisar, em andamento (por tipo, com a ação do próximo passo) e histórico. */
export function RequestPanel({ requests, lookups, mode, ownerOptions = [], defaultOwner = "" }: Props) {
  const pending = requests.filter((r) => r.status === "pendente");
  const active = requests.filter((r) => r.status === "aprovada" && r.progress && !FINAL_PROGRESS.includes(r.progress));
  const history = requests.filter((r) => r.status === "recusada" || (r.progress && FINAL_PROGRESS.includes(r.progress))).slice(0, 15);

  const actionFor = (r: ResourceRequest) => {
    if (r.kind === "compra" && r.progress === "aguardando") {
      return (
        <PurchaseCompleteForm
          action={completePurchaseAction.bind(null, r.id)}
          defaults={{ name: r.itemName, quantity: r.quantity, estimatedValue: r.estimatedValue, ownerEixo: defaultOwner }}
          ownerOptions={ownerOptions}
        />
      );
    }
    const next = r.progress ? NEXT_PROGRESS[r.kind]?.[r.progress] : undefined;
    return next ? (
      <div className="flex justify-end">
        <ProgressButton action={advanceRequestAction.bind(null, r.id, next.to)} label={next.label} />
      </div>
    ) : null;
  };

  return (
    <div className="space-y-8">
      <Section id="para-analisar" title="Para analisar" count={pending.length} empty="Nenhuma requisição aguardando análise">
        {pending.map((r) => (
          <RequestItem key={r.id} request={r} lookups={lookups} showRequester>
            <DecisionForm action={resolveRequestAction.bind(null, r.id)} />
          </RequestItem>
        ))}
      </Section>

      {IN_PROGRESS.filter((s) => (mode === "diretoria" ? s.kinds.includes("pedido") : !s.kinds.includes("pedido"))).map((s) => {
        const items = active.filter((r) => s.kinds.includes(r.kind));
        return (
          <Section key={s.id} id={s.id} title={s.title} count={items.length}>
            {items.map((r) => (
              <RequestItem key={r.id} request={r} lookups={lookups} showRequester>
                {actionFor(r)}
              </RequestItem>
            ))}
          </Section>
        );
      })}

      <Section id="historico" title="Histórico recente" count={history.length}>
        {history.map((r) => (
          <RequestItem key={r.id} request={r} lookups={lookups} showRequester />
        ))}
      </Section>
    </div>
  );
}
