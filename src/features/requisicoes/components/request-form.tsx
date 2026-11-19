"use client";

import { Cpu, FolderKanban, Hash, MessageSquareText, PackageOpen, Send, Wrench } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { REQUEST_KIND_LABEL } from "@/config/options";
import { useFormSubmit } from "@/lib/form";
import { cn } from "@/lib/cn";
import type { ActionResult, InventoryAvailability, Project, RequestKind } from "@/types";
import { requestSchema } from "../schemas";

type Props = {
  action: (input: unknown) => Promise<ActionResult>;
  inventory: InventoryAvailability[];
  projects: Pick<Project, "id" | "name">[];
  /** Quem vai analisar (ex.: "a coordenação do seu eixo", "a diretoria"). */
  reviewerLabel: string;
};

const KINDS: { value: RequestKind; icon: typeof Cpu; hint: string }[] = [
  { value: "componente", icon: Cpu, hint: "Item do inventário do RAITec" },
  { value: "recurso", icon: Wrench, hint: "Sala, impressora 3D, verba…" },
];

/** Requisição de componente ou recurso, opcionalmente vinculada a um projeto afiliado. */
export function RequestForm({ action, inventory, projects, reviewerLabel }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<RequestKind>("componente");
  const [notice, setNotice] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(requestSchema, async (data) => {
    setNotice(null);
    const result = await action(data);
    if (result.ok) {
      formRef.current?.reset();
      setKind("componente");
      setNotice(`Requisição enviada para ${reviewerLabel}.`);
    }
    return result;
  });

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-brand-900">
          <PackageOpen className="size-4 text-accent-600" aria-hidden /> Nova requisição
        </p>
        <p className="-mt-2 text-xs text-ink-subtle">Será analisada por {reviewerLabel}.</p>
        {formError && <Alert tone="danger">{formError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <fieldset className="space-y-2">
          <legend className="pl-1 font-display text-xs font-semibold text-brand-900">Tipo</legend>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map(({ value, icon: Icon, hint }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-field px-3 py-3 ring-1 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-500",
                  kind === value ? "bg-brand-900 text-white ring-brand-900 shadow-glow" : "bg-surface text-brand-950 ring-line hover:ring-brand-200",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="sr-only"
                />
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{REQUEST_KIND_LABEL[value]}</span>
                  <span className={cn("block text-xs", kind === value ? "text-brand-200" : "text-ink-subtle")}>{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {kind === "componente" ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Select
              id="componentId"
              label="Componente"
              icon={Cpu}
              placeholder="Escolha do inventário..."
              options={inventory.map((i) => ({ value: i.id, label: `${i.name} — ${i.available} disponível(is)`, disabled: i.available === 0 }))}
              error={errors.componentId}
            />
            <Input id="quantity" type="number" min={1} max={50} label="Qtd." icon={Hash} defaultValue={1} error={errors.quantity} />
          </div>
        ) : (
          <>
            <Input id="description" label="Recurso" icon={Wrench} placeholder="Ex.: sala de reuniões às quintas, 14h" error={errors.description} />
            <input type="hidden" name="quantity" value="1" />
          </>
        )}

        <Select
          id="projectId"
          label="Projeto (opcional)"
          icon={FolderKanban}
          placeholder={projects.length ? "Sem projeto vinculado" : "Nenhum projeto disponível"}
          placeholderSelectable
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          error={errors.projectId}
        />

        <Textarea
          id="justification"
          label="Justificativa"
          icon={MessageSquareText}
          placeholder="Para que você precisa e até quando?"
          maxLength={500}
          error={errors.justification}
        />

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
            Enviar requisição <Send className="size-4" aria-hidden />
          </Button>
        </div>
      </form>
    </Card>
  );
}
