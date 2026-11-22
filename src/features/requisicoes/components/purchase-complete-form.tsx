"use client";

import { Archive, Banknote, Cpu, Hash, Layers, PackageCheck, Tag } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import { CABINETS, COMPONENT_CATEGORIES } from "@/config/requests";
import { useFormSubmit } from "@/lib/form";
import type { ActionResult } from "@/types";
import { purchaseSchema } from "../schemas";

type Props = {
  action: (input: unknown) => Promise<ActionResult>;
  defaults: { name: string; quantity: number; estimatedValue: number; ownerEixo: string };
  /** Eixos que quem conclui pode atribuir como dono (+ "sem propriedade"). */
  ownerOptions: { value: string; label: string }[];
};

/** "Marcar como feito" de uma compra: pede os dados do item que entra no inventário (em uso). */
export function PurchaseCompleteForm({ action, defaults, ownerOptions }: Props) {
  const [open, setOpen] = useState(false);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(purchaseSchema, (data) =>
    action(data),
  );

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <PackageCheck className="size-4" aria-hidden /> Marcar como feito
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onChange={handleChange}
      noValidate
      className="animate-fade-up space-y-3 rounded-field bg-surface-muted/60 p-3"
    >
      <p className="text-xs text-ink-muted">
        O item entra no inventário <strong>em uso</strong> e é adicionado ao projeto vinculado (sem projeto, fica
        emprestado a quem pediu).
      </p>
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Input id="name" label="Nome no inventário" icon={Cpu} defaultValue={defaults.name} error={errors.name} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          id="category"
          label="Categoria"
          icon={Tag}
          placeholder="Escolha..."
          options={COMPONENT_CATEGORIES}
          error={errors.category}
        />
        <Select
          id="cabinet"
          label="Armário"
          icon={Archive}
          placeholder="Escolha..."
          options={CABINETS}
          error={errors.cabinet}
        />
        <Select
          id="ownerEixo"
          label="Eixo proprietário"
          icon={Layers}
          placeholder="Escolha..."
          options={ownerOptions}
          defaultValue={defaults.ownerEixo}
          error={errors.ownerEixo}
        />
        <Input
          id="quantity"
          type="number"
          min={1}
          label="Quantidade comprada"
          icon={Hash}
          defaultValue={defaults.quantity}
          error={errors.quantity}
        />
        <Input
          id="paidValue"
          type="number"
          min={0}
          step="0.01"
          label="Valor pago (R$)"
          icon={Banknote}
          defaultValue={defaults.estimatedValue}
          error={errors.paidValue}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          Registrar compra
        </Button>
      </div>
    </form>
  );
}
