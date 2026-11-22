"use client";

import { Archive, Cpu, Hash, Layers, Save, Send, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, buttonVariants, Input, Select } from "@/components/ui";
import { CABINETS, COMPONENT_CATEGORIES } from "@/config/requests";
import { useFormSubmit } from "@/lib/form";
import type { ActionResult, InventoryItem } from "@/types";
import { inventoryItemSchema } from "../schemas";

type Props = {
  action: (input: unknown) => Promise<ActionResult>;
  item?: InventoryItem;
  ownerOptions: { value: string; label: string }[];
  cancelHref: string;
  /** Time Processos: a alteração vira proposta e só vale depois de aprovada. */
  asProposal: boolean;
};

export function InventoryForm({ action, item, ownerOptions, cancelHref, asProposal }: Props) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    inventoryItemSchema,
    async (data) => {
      const result = await action(data);
      if (result.ok) {
        if (result.pending) setSent(true);
        else router.push(`/inventario/${result.id ?? item!.id}`);
      }
      return result;
    },
  );

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert tone="success">
          Proposta enviada. Ela aparece no Painel da Coordenação e só muda o inventário depois de aprovada.
        </Alert>
        <Link href="/inventario" className={buttonVariants({ variant: "secondary" })}>
          Voltar ao inventário
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {asProposal && (
        <Alert tone="info">
          Você é do time Processos: esta alteração vai como proposta para a coordenação ou a diretoria aprovar.
        </Alert>
      )}
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Input
        id="name"
        label="Nome do componente"
        icon={Cpu}
        placeholder="Ex.: Sensor ultrassônico HC-SR04"
        defaultValue={item?.name}
        error={errors.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="category"
          label="Categoria"
          icon={Tag}
          placeholder="Escolha..."
          options={COMPONENT_CATEGORIES}
          defaultValue={item?.category}
          error={errors.category}
        />
        <Select
          id="cabinet"
          label="Armário"
          icon={Archive}
          placeholder="Escolha..."
          options={CABINETS}
          defaultValue={item?.cabinet}
          error={errors.cabinet}
        />
        <Select
          id="ownerEixo"
          label="Eixo proprietário"
          icon={Layers}
          placeholder="Escolha..."
          options={ownerOptions}
          defaultValue={item ? (item.ownerEixo ?? "sem") : undefined}
          error={errors.ownerEixo}
        />
        <Input
          id="total"
          type="number"
          min={0}
          label="Quantidade total"
          icon={Hash}
          defaultValue={item?.total ?? 1}
          error={errors.total}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary", size: "lg" })}>
          Cancelar
        </Link>
        <Button type="submit" size="lg" loading={loading} className="sm:min-w-48">
          {asProposal ? <Send className="size-4" aria-hidden /> : <Save className="size-4" aria-hidden />}
          {asProposal ? "Enviar proposta" : item ? "Salvar alterações" : "Adicionar item"}
        </Button>
      </div>
    </form>
  );
}
