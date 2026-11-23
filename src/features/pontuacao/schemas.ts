import { z } from "zod";
import { ACTIVITY_MAX_POINTS, ACTIVITY_STATUSES, ACTIVITY_TYPES } from "@/config/options";
import { isoDate } from "@/lib/validation";
import type { ActivityStatus, ActivityType } from "@/types";

const activityTypes = ACTIVITY_TYPES as [ActivityType, ...ActivityType[]];
const activityStatuses = ACTIVITY_STATUSES as [ActivityStatus, ...ActivityStatus[]];

export const activitySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Descreva a atividade (mínimo de 3 caracteres).")
    .max(120, "Use no máximo 120 caracteres."),
  type: z.enum(activityTypes, { error: "Escolha o tipo." }),
  date: isoDate("Informe a data."),
  status: z.enum(activityStatuses, { error: "Escolha o status." }),
  points: z.coerce
    .number({ error: "Informe os pontos." })
    .int("Use um número inteiro.")
    .min(0, "Use 0 ou mais.")
    .max(ACTIVITY_MAX_POINTS, `No máximo ${ACTIVITY_MAX_POINTS} pontos por atividade.`),
});

export const scoreAdjustmentSchema = z.object({
  delta: z.coerce
    .number({ error: "Informe o ajuste." })
    .int("Use um número inteiro.")
    .min(-100, "Ajuste entre -100 e 100.")
    .max(100, "Ajuste entre -100 e 100.")
    .refine((n) => n !== 0, "O ajuste não pode ser zero."),
  reason: z
    .string()
    .trim()
    .min(5, "Explique o motivo (mínimo de 5 caracteres).")
    .max(200, "Use no máximo 200 caracteres."),
});

export type ActivityFormInput = z.infer<typeof activitySchema>;
