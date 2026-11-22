import { Cpu, Trash2 } from "lucide-react";
import { Card, ConfirmButton, EmptyState, SectionTitle } from "@/components/ui";
import type { InventoryAvailability, Project } from "@/types";
import { allocateComponentAction, removeComponentAction } from "../actions";
import { AllocationForm } from "./allocation-form";

type Props = { project: Project; inventory: InventoryAvailability[]; canManage: boolean };

/** Componentes de propriedade do RAITec alocados ao projeto. */
export function ProjectComponents({ project, inventory, canManage }: Props) {
  const byId = new Map(inventory.map((i) => [i.id, i]));

  return (
    <section aria-labelledby="componentes" className="space-y-3">
      <div>
        <SectionTitle id="componentes">Componentes utilizados</SectionTitle>
        <p className="text-xs text-ink-subtle">Itens do inventário do RAITec alocados a este projeto</p>
      </div>
      <Card className="p-2">
        {project.components.length === 0 ? (
          <EmptyState icon={Cpu} title="Nenhum componente alocado">
            {canManage ? "Aloque itens do inventário abaixo." : "Peça componentes em Minha área → Requisições."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line/70">
            {project.components.map((c) => {
              const item = byId.get(c.componentId);
              return (
                <li key={c.componentId} className="flex items-center gap-3 px-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700">
                    <Cpu className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-950">
                      {item?.name ?? "Componente removido"}
                    </span>
                    <span className="block text-xs text-ink-subtle">{item?.category}</span>
                  </span>
                  <span className="font-display text-sm font-bold text-iris-600">×{c.quantity}</span>
                  {canManage && (
                    <ConfirmButton
                      onConfirm={removeComponentAction.bind(null, project.id, c.componentId)}
                      confirmLabel="Devolver"
                      aria-label={`Devolver ${item?.name ?? "componente"} ao inventário`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </ConfirmButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {canManage && <AllocationForm action={allocateComponentAction.bind(null, project.id)} inventory={inventory} />}
    </section>
  );
}
