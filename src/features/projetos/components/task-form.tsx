"use client";

import { CalendarClock, ListPlus, Plus, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, Card, Input, Select } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import type { ActionResult } from "@/types";
import { taskSchema } from "../schemas";

type Props = { action: (input: unknown) => Promise<ActionResult>; members: { value: string; label: string }[] };

/** Nova tarefa (coordenação). O responsável precisa ser afiliado ao projeto. */
export function TaskForm({ action, members }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(taskSchema, async (data) => {
    setNotice(null);
    const result = await action(data);
    if (result.ok) {
      formRef.current?.reset();
      setNotice(`Tarefa "${data.title}" adicionada.`);
    }
    return result;
  });

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-brand-900">
          <ListPlus className="size-4 text-accent-600" aria-hidden /> Nova tarefa
        </p>
        {formError && <Alert tone="danger">{formError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <Input id="title" label="Tarefa" icon={ListPlus} placeholder="O que precisa ser feito?" error={errors.title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="assigneeId"
            label="Responsável"
            icon={UserRound}
            placeholder="Sem responsável"
            placeholderSelectable
            options={members}
            error={errors.assigneeId}
          />
          <Input id="deadline" type="date" label="Prazo" icon={CalendarClock} error={errors.deadline} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            <Plus className="size-4" aria-hidden /> Adicionar tarefa
          </Button>
        </div>
      </form>
    </Card>
  );
}
