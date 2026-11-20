import { Inbox } from "lucide-react";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import type { ResourceRequest } from "@/types";
import { RequestItem, type RequestLookups } from "./request-item";

/** Requisições feitas pelo membro, da mais recente para a mais antiga, com status e andamento. */
export function MyRequests({ requests, lookups }: { requests: ResourceRequest[]; lookups: RequestLookups }) {
  return (
    <section aria-labelledby="minhas-requisicoes" className="space-y-3">
      <SectionTitle id="minhas-requisicoes">Minhas requisições</SectionTitle>
      <Card className="p-2">
        {requests.length === 0 ? (
          <EmptyState icon={Inbox} title="Você ainda não fez requisições" />
        ) : (
          <ul className="divide-y divide-line/70">
            {requests.map((r) => (
              <RequestItem key={r.id} request={r} lookups={lookups} />
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
