import { z } from "zod";
import { ACTIVITY_STATUSES } from "@/config/options";
import { isoDate } from "@/lib/validation";
import type { ActivityStatus } from "@/types";

const statuses = ACTIVITY_STATUSES as [ActivityStatus, ...ActivityStatus[]];

export const goalSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Descreva a meta (mínimo de 3 caracteres).")
    .max(120, "Use no máximo 120 caracteres."),
  deadline: isoDate("Informe o prazo."),
  status: z.enum(statuses, { error: "Escolha o status." }),
});
