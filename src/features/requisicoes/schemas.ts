import { z } from "zod";
import { EIXOS } from "@/config/options";
import { CABINETS, COMPONENT_CATEGORIES, ROOMS } from "@/config/requests";
import type { Eixo } from "@/types";
import { isoDate, optionalId, optionalText } from "@/lib/validation";

const justification = z
  .string({ error: "Explique para que você precisa." })
  .trim()
  .min(10, "Explique para que você precisa (mín. 10 caracteres).")
  .max(500, "Máximo de 500 caracteres.");
const quantity = z.coerce.number({ error: "Informe a quantidade." }).int("Use um número inteiro.").min(1, "Mínimo 1.").max(50, "Máximo 50.");
const money = (msg: string) => z.coerce.number({ error: msg }).positive(msg).max(100_000, "Valor muito alto.");
const text = (min: number, max: number, msg: string) => z.string({ error: msg }).trim().min(min, msg).max(max, `Máximo de ${max} caracteres.`);
const common = { justification, projectId: optionalId };

/** Requisição de membro: os campos dependem do tipo. */
export const memberRequestSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("componente"), componentId: z.string({ error: "Escolha um componente." }).min(1, "Escolha um componente."), quantity, ...common }),
    z.object({
      kind: z.literal("reuniao"),
      date: isoDate("Informe a data."),
      time: z.string({ error: "Informe o horário." }).regex(/^\d{2}:\d{2}$/, "Informe o horário."),
      room: z.enum(ROOMS.map((r) => r.value) as [string, ...string[]], { error: "Escolha uma sala." }),
      ...common,
    }),
    z
      .object({ kind: z.literal("autorizacao"), startDate: isoDate("Informe a data de início."), endDate: isoDate("Informe a data de expiração."), ...common })
      .refine((d) => d.endDate >= d.startDate, { path: ["endDate"], message: "A expiração precisa ser depois do início." }),
    z.object({
      kind: z.literal("verba"),
      amount: money("Informe o valor."),
      usage: text(5, 300, "Diga como a verba será utilizada."),
      deadline: isoDate("Informe o prazo de confecção."),
      ...common,
    }),
    z.object({
      kind: z.literal("compra"),
      itemName: text(2, 80, "Informe o componente."),
      quantity,
      deadline: isoDate("Informe o prazo de confecção."),
      estimatedValue: money("Informe o valor estimado."),
      ...common,
    }),
    z.object({
      kind: z.literal("outros"),
      explanation: text(5, 500, "Explique o que você precisa."),
      date: z.preprocess((v) => (v === "" ? null : v), isoDate("Data inválida.").nullable().default(null)),
      ...common,
    }),
  ],
  { error: "Escolha o tipo de requisição." },
);

/** Pedido de coordenador à diretoria. */
export const directorRequestSchema = z.object({
  kind: z.literal("pedido"),
  title: text(3, 80, "Dê um título (mín. 3 caracteres)."),
  explanation: text(5, 500, "Explique o que é preciso."),
  justification,
});

export const resolveSchema = z
  .object({
    decision: z.enum(["aprovada", "recusada"]),
    note: optionalText(300, "Máximo de 300 caracteres."),
  })
  .refine((d) => d.decision === "aprovada" || !!d.note, { path: ["note"], message: "Explique o motivo da recusa." });

/** Dados pedidos ao marcar uma compra como feita. */
export const purchaseSchema = z.object({
  name: text(2, 80, "Informe o nome do componente."),
  category: z.enum(COMPONENT_CATEGORIES.map((c) => c.value) as [string, ...string[]], { error: "Escolha a categoria." }),
  cabinet: z.enum(CABINETS.map((c) => c.value) as [string, ...string[]], { error: "Escolha o armário." }),
  ownerEixo: z.preprocess(
    (v) => (v === "" || v === "sem" ? null : v),
    z.enum(EIXOS.map((e) => e.value) as [Eixo, ...Eixo[]]).nullable(),
  ),
  quantity,
  paidValue: money("Informe o valor pago."),
});
