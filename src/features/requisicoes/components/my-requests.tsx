import { Inbox } from "lucide-react";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import type { ResourceRequest } from "@/types";
import { RequestItem } from "./request-item";

type Props = {
  requests: ResourceRequest[];
  componentNames: Record<string, string>;
  projectNames: Record<string, string>;
  memberNames: Record<string, string>;
};

/** Requisições feitas pelo membro, da mais recente para a mais antiga. */
export function MyRequests({ requests, componentNames, projectNames, memberNames }: Props) {
  return (
    <section aria-labelledby="minhas-requisicoes" className="space-y-3">
      <SectionTitle id="minhas-requisicoes">Minhas requisições</SectionTitle>
      <Card className="p-2">
        {requests.length === 0 ? (
          <EmptyState icon={Inbox} title="Você ainda não fez requisições" />
        ) : (
          <ul className="divide-y divide-line/70">
            {requests.map((r) => (
              <RequestItem
                key={r.id}
                request={r}
                componentName={r.componentId ? componentNames[r.componentId] : undefined}
                projectName={r.projectId ? projectNames[r.projectId] : undefined}
                resolverName={r.resolution ? memberNames[r.resolution.by] : undefined}
              />
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
