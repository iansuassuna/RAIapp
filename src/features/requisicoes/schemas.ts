import { z } from "zod";
import { optionalId, optionalText } from "@/lib/validation";

export const requestSchema = z
  .object({
    kind: z.enum(["componente", "recurso"], { error: "Escolha o tipo de requisição." }),
    componentId: optionalId,
    quantity: z.coerce.number({ error: "Informe a quantidade." }).int("Use um número inteiro.").min(1, "Mínimo 1.").max(50, "Máximo 50."),
    description: optionalText(200, "Máximo de 200 caracteres."),
    justification: z
      .string({ error: "Explique para que você precisa." })
      .trim()
      .min(10, "Explique para que você precisa (mín. 10 caracteres).")
      .max(500, "Máximo de 500 caracteres."),
    projectId: optionalId,
  })
  .superRefine((d, ctx) => {
    if (d.kind === "componente" && !d.componentId) {
      ctx.addIssue({ code: "custom", path: ["componentId"], message: "Escolha um componente do inventário." });
    }
    if (d.kind === "recurso" && !d.description) {
      ctx.addIssue({ code: "custom", path: ["description"], message: "Descreva o recurso (ex.: sala, impressora 3D)." });
    }
  });

export const resolveSchema = z
  .object({
    decision: z.enum(["aprovada", "recusada"]),
    note: optionalText(300, "Máximo de 300 caracteres."),
  })
  .refine((d) => d.decision === "aprovada" || !!d.note, { path: ["note"], message: "Explique o motivo da recusa." });
