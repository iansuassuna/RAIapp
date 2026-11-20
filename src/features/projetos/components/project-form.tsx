"use client";

import { CalendarClock, CalendarDays, Flag, FolderKanban, Save, Text } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, buttonVariants, CheckboxGroup, Input, Select, Textarea } from "@/components/ui";
import { memberRoleOrTime, PROJECT_STATUS_LABEL, PROJECT_STATUSES } from "@/config/options";
import { useFormSubmit } from "@/lib/form";
import type { ActionResult, Member, Project } from "@/types";
import { projectSchema } from "../schemas";

type Props = {
  eixoMembers: Member[];
  project?: Project;
  cancelHref: string;
  /** Server Action já vinculada (criar no eixo ou atualizar o projeto). */
  action: (input: unknown) => Promise<ActionResult>;
  /** Lista de projetos do eixo (ex.: /eixos/inovacao/projetos). Depois de salvar, vai para `${projectsHref}/${id}`. */
  projectsHref: string;
};

const statusOptions = PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }));

export function ProjectForm({ eixoMembers, project, cancelHref, action, projectsHref }: Props) {
  const router = useRouter();
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(projectSchema, async (data) => {
    const result = await action(data);
    if (result.ok) router.push(`${projectsHref}/${result.id ?? project!.id}`);
    return result;
  });

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Input id="name" label="Nome do projeto" icon={FolderKanban} placeholder="Ex.: Robô seguidor de linha" defaultValue={project?.name} error={errors.name} />
      <Textarea
        id="description"
        label="Descrição (opcional)"
        icon={Text}
        placeholder="Objetivo e escopo do projeto..."
        defaultValue={project?.description}
        maxLength={500}
        error={errors.description}
      />
      <Select
        id="status"
        label="Status"
        icon={Flag}
        placeholder="Selecione o status..."
        options={statusOptions}
        defaultValue={project?.status ?? "planejamento"}
        error={errors.status}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="startDate" type="date" label="Início" icon={CalendarDays} defaultValue={project?.startDate} error={errors.startDate} />
        <Input id="deadline" type="date" label="Prazo final" icon={CalendarClock} defaultValue={project?.deadline} error={errors.deadline} />
      </div>
      <CheckboxGroup
        name="memberIds"
        legend="Membros afiliados"
        hint="Só membros do eixo podem ser afiliados."
        options={eixoMembers.map((m) => ({
          value: m.id,
          label: m.name,
          hint: memberRoleOrTime(m),
        }))}
        defaultValues={project?.memberIds}
        error={errors.memberIds}
      />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary", size: "lg" })}>
          Cancelar
        </Link>
        <Button type="submit" size="lg" loading={loading} className="sm:min-w-48">
          <Save className="size-4" aria-hidden /> {project ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}
