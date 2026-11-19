import { Boxes } from "lucide-react";
import { Card, Progress, SectionTitle } from "@/components/ui";
import type { InventoryAvailability } from "@/types";

/** Disponibilidade do inventário de componentes do RAITec (apoio à análise de requisições). */
export function InventoryOverview({ inventory }: { inventory: InventoryAvailability[] }) {
  return (
    <section aria-labelledby="inventario" className="space-y-3">
      <div>
        <SectionTitle id="inventario">Inventário do RAITec</SectionTitle>
        <p className="text-xs text-ink-subtle">Disponível agora / total</p>
      </div>
      <Card className="space-y-4">
        {inventory.map((i) => (
          <div key={i.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Boxes className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />
                <span className="truncate font-medium text-brand-950">{i.name}</span>
              </span>
              <span className={`shrink-0 font-display font-bold ${i.available === 0 ? "text-danger-500" : "text-iris-600"}`}>
                {i.available}
                <span className="text-xs font-medium text-ink-subtle">/{i.total}</span>
              </span>
            </div>
            <Progress value={i.available} max={i.total} tone="light" label={`${i.name} disponível`} />
          </div>
        ))}
      </Card>
    </section>
  );
}
