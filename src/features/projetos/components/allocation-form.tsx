"use client";

import { Cpu, Hash, PackagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, Card, Input, Select } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import type { ActionResult, InventoryAvailability } from "@/types";
import { allocationSchema } from "../schemas";

type Props = { action: (input: unknown) => Promise<ActionResult>; inventory: InventoryAvailability[] };

/** Alocar componente do inventário ao projeto (coordenação). */
export function AllocationForm({ action, inventory }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(allocationSchema, async (data) => {
    setNotice(null);
    const result = await action(data);
    if (result.ok) {
      formRef.current?.reset();
      setNotice("Componente alocado ao projeto.");
    }
    return result;
  });

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-brand-900">
          <PackagePlus className="size-4 text-accent-600" aria-hidden /> Alocar componente
        </p>
        {formError && <Alert tone="danger">{formError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Select
            id="componentId"
            label="Componente"
            icon={Cpu}
            placeholder="Escolha do inventário..."
            options={inventory.map((i) => ({
              value: i.id,
              label: `${i.name} — ${i.available} disponível(is)`,
              disabled: i.available === 0,
            }))}
            error={errors.componentId}
          />
          <Input
            id="quantity"
            type="number"
            min={1}
            label="Qtd."
            icon={Hash}
            defaultValue={1}
            error={errors.quantity}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Alocar
          </Button>
        </div>
      </form>
    </Card>
  );
}
