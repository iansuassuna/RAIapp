"use client";

import {
  Banknote,
  CalendarClock,
  CalendarDays,
  Clock,
  Cpu,
  DoorOpen,
  Ellipsis,
  FolderKanban,
  Hash,
  KeyRound,
  type LucideIcon,
  MessageSquareText,
  PackageOpen,
  Send,
  ShoppingCart,
  Text,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, Card, DateInput, Input, Select, Textarea } from "@/components/ui";
import { eixoLabel } from "@/config/options";
import { cabinetLabel, MEMBER_REQUEST_KINDS, REQUEST_KIND_HINT, REQUEST_KIND_LABEL, ROOMS } from "@/config/requests";
import { cn } from "@/lib/cn";
import { useFormSubmit } from "@/lib/form";
import type { ActionResult, InventoryAvailability, Project, RequestKind } from "@/types";
import { memberRequestSchema } from "../schemas";

type Props = {
  action: (input: unknown) => Promise<ActionResult>;
  inventory: InventoryAvailability[];
  projects: Pick<Project, "id" | "name">[];
};

const KIND_ICON: Partial<Record<RequestKind, LucideIcon>> = {
  componente: Cpu,
  reuniao: Users,
  autorizacao: KeyRound,
  verba: Banknote,
  compra: ShoppingCart,
  outros: Ellipsis,
};

/** Requisição de membro à coordenação do eixo. Os campos mudam conforme o tipo escolhido. */
export function RequestForm({ action, inventory, projects }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<RequestKind>("componente");
  const [notice, setNotice] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    memberRequestSchema,
    async (data) => {
      setNotice(null);
      const result = await action(data);
      if (result.ok) {
        formRef.current?.reset();
        setNotice(`${REQUEST_KIND_LABEL[data.kind]}: requisição enviada para a coordenação do seu eixo.`);
      }
      // O aviso (sucesso ou erro) fica no topo do formulário; o botão de envio fica no fim. Traz o aviso à vista.
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
      return result;
    },
  );

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-brand-900">
          <PackageOpen className="size-4 text-accent-600" aria-hidden /> Nova requisição
        </p>
        <p className="-mt-2 text-xs text-ink-subtle">Será analisada pela coordenação do seu eixo.</p>
        {formError && <Alert tone="danger">{formError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <fieldset className="space-y-2">
          <legend className="pl-1 font-display text-xs font-semibold text-brand-900">Tipo</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEMBER_REQUEST_KINDS.map((value) => {
              const Icon = KIND_ICON[value]!;
              const selected = kind === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-field px-3 py-3 ring-1 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-500",
                    selected
                      ? "bg-brand-900 text-white ring-brand-900 shadow-glow"
                      : "bg-surface text-brand-950 ring-line hover:ring-brand-200",
                  )}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={value}
                    checked={selected}
                    onChange={() => setKind(value)}
                    className="sr-only"
                  />
                  <Icon className="size-5" aria-hidden />
                  <span className="text-sm font-semibold leading-tight">{REQUEST_KIND_LABEL[value]}</span>
                  <span className={cn("text-[11px] leading-tight", selected ? "text-brand-200" : "text-ink-subtle")}>
                    {REQUEST_KIND_HINT[value]}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {kind === "componente" && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Select
              id="componentId"
              label="Componente"
              icon={Cpu}
              placeholder="Escolha do inventário..."
              options={inventory.map((i) => ({
                value: i.id,
                label: `${i.name} — ${i.available} livre(s) · ${cabinetLabel(i.cabinet)} · ${i.ownerEixo ? eixoLabel(i.ownerEixo) : "sem dono"}`,
                disabled: i.available === 0,
              }))}
              error={errors.componentId}
            />
            <Input
              id="quantity"
              type="number"
              min={1}
              max={50}
              label="Qtd."
              icon={Hash}
              defaultValue={1}
              error={errors.quantity}
            />
          </div>
        )}

        {kind === "reuniao" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <DateInput id="date" label="Data" icon={CalendarDays} error={errors.date} />
            <Input id="time" type="time" label="Horário" icon={Clock} error={errors.time} />
            <Select
              id="room"
              label="Sala"
              icon={DoorOpen}
              placeholder="Escolha..."
              options={ROOMS}
              error={errors.room}
            />
          </div>
        )}

        {kind === "autorizacao" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <DateInput id="startDate" label="Data de início" icon={CalendarDays} error={errors.startDate} />
            <DateInput id="endDate" label="Data de expiração" icon={CalendarClock} error={errors.endDate} />
          </div>
        )}

        {kind === "verba" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                label="Valor (R$)"
                icon={Banknote}
                error={errors.amount}
              />
              <DateInput id="deadline" label="Prazo de confecção" icon={CalendarClock} error={errors.deadline} />
            </div>
            <Textarea
              id="usage"
              label="Como será utilizada"
              icon={Text}
              placeholder="Ex.: transporte de 4 membros até a feira"
              rows={2}
              maxLength={300}
              error={errors.usage}
            />
          </>
        )}

        {kind === "compra" && (
          <>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <Input
                id="itemName"
                label="Componente"
                icon={Cpu}
                placeholder="Ex.: Sensor de gás MQ-135"
                error={errors.itemName}
              />
              <Input
                id="quantity"
                type="number"
                min={1}
                max={50}
                label="Qtd."
                icon={Hash}
                defaultValue={1}
                error={errors.quantity}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateInput id="deadline" label="Prazo de confecção" icon={CalendarClock} error={errors.deadline} />
              <Input
                id="estimatedValue"
                type="number"
                min={0}
                step="0.01"
                label="Valor estimado (R$)"
                icon={Banknote}
                error={errors.estimatedValue}
              />
            </div>
          </>
        )}

        {kind === "outros" && (
          <>
            <Textarea
              id="explanation"
              label="Explicação"
              icon={Text}
              placeholder="O que você precisa?"
              rows={3}
              maxLength={500}
              error={errors.explanation}
            />
            <DateInput id="date" label="Data / prazo (opcional)" icon={CalendarDays} error={errors.date} />
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
          placeholder="Por que isso é necessário?"
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
