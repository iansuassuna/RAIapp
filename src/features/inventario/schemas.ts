import { z } from "zod";
import { EIXOS } from "@/config/options";
import { CABINETS, COMPONENT_CATEGORIES } from "@/config/requests";
import { optionalText } from "@/lib/validation";
import type { Eixo } from "@/types";

export const inventoryItemSchema = z.object({
  name: z
    .string({ error: "Informe o nome." })
    .trim()
    .min(2, "Informe o nome do componente.")
    .max(80, "Máximo de 80 caracteres."),
  category: z.enum(COMPONENT_CATEGORIES.map((c) => c.value) as [string, ...string[]], {
    error: "Escolha a categoria.",
  }),
  cabinet: z.enum(CABINETS.map((c) => c.value) as [string, ...string[]], { error: "Escolha o armário." }),
  ownerEixo: z.preprocess(
    (v) => (v === "" || v === "sem" ? null : v),
    z.enum(EIXOS.map((e) => e.value) as [Eixo, ...Eixo[]]).nullable(),
  ),
  total: z.coerce
    .number({ error: "Informe a quantidade." })
    .int("Use um número inteiro.")
    .min(0, "Não pode ser negativo.")
    .max(10_000, "Quantidade muito alta."),
});

export const proposalDecisionSchema = z
  .object({ decision: z.enum(["aplicada", "recusada"]), note: optionalText(300, "Máximo de 300 caracteres.") })
  .refine((d) => d.decision === "aplicada" || !!d.note, { path: ["note"], message: "Explique o motivo da recusa." });
