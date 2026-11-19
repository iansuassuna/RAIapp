import { z } from "zod";
import { PROJECT_STATUSES, TASK_STATUSES } from "@/config/options";
import type { ProjectStatus, TaskStatus } from "@/types";
import { isoDate, optionalId, optionalText, stringArray } from "@/lib/validation";

export const projectSchema = z
  .object({
    name: z.string().trim().min(3, "Informe o nome do projeto (mín. 3 caracteres).").max(80, "Máximo de 80 caracteres."),
    description: optionalText(500, "A descrição pode ter no máximo 500 caracteres."),
    status: z.enum(PROJECT_STATUSES as [ProjectStatus, ...ProjectStatus[]], { error: "Selecione o status." }),
    startDate: isoDate("Informe a data de início."),
    deadline: isoDate("Informe o prazo final."),
    memberIds: stringArray,
  })
  .refine((d) => d.deadline >= d.startDate, { path: ["deadline"], message: "O prazo precisa ser depois do início." });

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Descreva a tarefa (mín. 3 caracteres).").max(120, "Máximo de 120 caracteres."),
  assigneeId: optionalId,
  deadline: isoDate("Informe o prazo da tarefa."),
});

export const taskStatusSchema = z.enum(TASK_STATUSES as [TaskStatus, ...TaskStatus[]]);

export const allocationSchema = z.object({
  componentId: z.string({ error: "Escolha um componente." }).min(1, "Escolha um componente."),
  quantity: z.coerce.number({ error: "Informe a quantidade." }).int("Use um número inteiro.").min(1, "Mínimo 1."),
});
