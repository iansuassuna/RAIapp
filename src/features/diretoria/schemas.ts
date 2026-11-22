import { z } from "zod";
import { EIXOS, TIMES } from "@/config/options";
import type { Eixo, Role, Time } from "@/types";

const eixoValues = EIXOS.map((e) => e.value) as [Eixo, ...Eixo[]];
const timeValues = TIMES.map((t) => t.value) as [Time, ...Time[]];
const roleValues = ["membro", "coordenador", "diretoria"] as const satisfies readonly Role[];

export const memberRoleSchema = z
  .object({
    role: z.enum(roleValues, { error: "Selecione um papel." }),
    eixo: z.union([z.enum(eixoValues), z.literal(""), z.null()]).optional(),
    time: z.union([z.enum(timeValues), z.literal(""), z.null()]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "membro") {
      if (!data.eixo) {
        ctx.addIssue({ code: "custom", path: ["eixo"], message: "Selecione o eixo do membro." });
      }
      if (!data.time) {
        ctx.addIssue({ code: "custom", path: ["time"], message: "Selecione o time do membro." });
      }
    }
    if (data.role === "coordenador" && !data.eixo) {
      ctx.addIssue({ code: "custom", path: ["eixo"], message: "Selecione o eixo coordenado." });
    }
  })
  .transform((data) => ({
    role: data.role,
    eixo: data.role === "diretoria" ? null : ((data.eixo || null) as Eixo | null),
    time: data.role === "membro" ? ((data.time || null) as Time | null) : null,
  }));

export type MemberRoleSchemaInput = z.input<typeof memberRoleSchema>;
