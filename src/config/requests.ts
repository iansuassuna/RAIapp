import type { RequestKind, RequestProgress, ResourceRequest } from "@/types";

/**
 * Tipos de requisição e o ciclo de andamento de cada um depois de aprovada.
 * Fonte única: formulário, painel, prazos e regras de transição leem daqui.
 */

type Tone = "brand" | "warning" | "success" | "danger" | "accent";

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  componente: "Componente do inventário",
  reuniao: "Reunião",
  autorizacao: "Autorização de uso",
  verba: "Verba",
  compra: "Componente não disponível",
  outros: "Outros",
  pedido: "Pedido à diretoria",
};

export const REQUEST_KIND_HINT: Record<RequestKind, string> = {
  componente: "Item que já existe no inventário",
  reuniao: "Reservar uma sala",
  autorizacao: "Usar um espaço ou equipamento por um período",
  verba: "Dinheiro para uma finalidade",
  compra: "Comprar um componente que o RAITec não tem",
  outros: "Qualquer outro pedido",
  pedido: "Pedido da coordenação à diretoria",
};

/** Tipos que um membro pode pedir à coordenação (nesta ordem no formulário). */
export const MEMBER_REQUEST_KINDS: RequestKind[] = [
  "componente",
  "reuniao",
  "autorizacao",
  "verba",
  "compra",
  "outros",
];

export const PROGRESS_LABEL: Record<RequestProgress, string> = {
  "em-uso": "Em uso",
  devolvido: "Devolvido",
  agendada: "Agendada",
  realizada: "Realizada",
  ativa: "Ativa",
  expirada: "Expirada",
  revogada: "Revogada",
  "aguardando-liberacao": "Aguardando liberação",
  liberada: "Liberada",
  "prestacao-entregue": "Prestação de contas entregue",
  aguardando: "Aguardando",
  feito: "Feito",
};

export const PROGRESS_TONE: Record<RequestProgress, Tone> = {
  "em-uso": "accent",
  devolvido: "brand",
  agendada: "brand",
  realizada: "success",
  ativa: "accent",
  expirada: "brand",
  revogada: "danger",
  "aguardando-liberacao": "warning",
  liberada: "accent",
  "prestacao-entregue": "success",
  aguardando: "warning",
  feito: "success",
};

/** Andamento inicial ao aprovar. */
export const INITIAL_PROGRESS: Record<RequestKind, RequestProgress> = {
  componente: "em-uso",
  reuniao: "agendada",
  autorizacao: "ativa",
  verba: "aguardando-liberacao",
  compra: "aguardando",
  outros: "aguardando",
  pedido: "aguardando",
};

/**
 * Próximos passos manuais (botões do painel). Compra → feito é feita por `completePurchase`
 * (pede os dados do item), por isso não está aqui.
 */
export const NEXT_PROGRESS: Partial<
  Record<RequestKind, Partial<Record<RequestProgress, { to: RequestProgress; label: string }>>>
> = {
  componente: { "em-uso": { to: "devolvido", label: "Marcar devolvido" } },
  reuniao: { agendada: { to: "realizada", label: "Marcar realizada" } },
  autorizacao: { ativa: { to: "revogada", label: "Revogar" } },
  verba: {
    "aguardando-liberacao": { to: "liberada", label: "Marcar liberada" },
    liberada: { to: "prestacao-entregue", label: "Prestação entregue" },
  },
  outros: { aguardando: { to: "feito", label: "Marcar feito" } },
  pedido: { aguardando: { to: "feito", label: "Marcar feito" } },
};

/** Andamentos que encerram o ciclo. */
export const FINAL_PROGRESS: RequestProgress[] = [
  "devolvido",
  "realizada",
  "expirada",
  "revogada",
  "prestacao-entregue",
  "feito",
];

/**
 * Andamento efetivo na data de hoje: reunião passada vira "realizada" e
 * autorização vencida vira "expirada" sem ninguém precisar clicar.
 */
export function effectiveProgress(r: ResourceRequest, today: string): RequestProgress | null {
  if (r.progress === "agendada" && r.kind === "reuniao" && r.date < today) return "realizada";
  if (r.progress === "ativa" && r.kind === "autorizacao" && r.endDate < today) return "expirada";
  return r.progress;
}

/** Prazo da requisição, quando o tipo tem um. */
export function requestDeadline(r: ResourceRequest): string | null {
  switch (r.kind) {
    case "compra":
    case "verba":
      return r.deadline;
    case "reuniao":
      return r.date;
    case "outros":
      return r.date;
    case "autorizacao":
      return r.endDate;
    default:
      return null;
  }
}

/** Título curto para listas. `componentName` resolve o nome de itens do inventário. */
export function requestTitle(r: ResourceRequest, componentName: (id: string) => string): string {
  switch (r.kind) {
    case "componente":
      return `${componentName(r.componentId)} ×${r.quantity}`;
    case "reuniao":
      return `Reunião · ${roomLabel(r.room)}`;
    case "autorizacao":
      return "Autorização de uso";
    case "verba":
      return `Verba de ${formatBRL(r.amount)}`;
    case "compra":
      return `Comprar ${r.itemName} ×${r.quantity}`;
    case "outros":
      return r.explanation.length > 60 ? `${r.explanation.slice(0, 57)}…` : r.explanation;
    case "pedido":
      return r.title;
  }
}

/* ---------- Listas fixas (troque quando houver backend) ---------- */

export const ROOMS = [
  { value: "sala-1", label: "Sala 1" },
  { value: "sala-2", label: "Sala 2" },
  { value: "lab-eletronica", label: "Laboratório de eletrônica" },
  { value: "auditorio", label: "Auditório" },
];

export const CABINETS = ["A1", "A2", "A3", "B1", "B2", "C1", "C2"].map((c) => ({ value: c, label: `Armário ${c}` }));

export const COMPONENT_CATEGORIES = [
  "Microcontrolador",
  "Computador",
  "Sensor",
  "Atuador",
  "Prototipagem",
  "Energia",
  "Ferramenta",
  "Outros",
].map((c) => ({ value: c, label: c }));

export function roomLabel(value: string) {
  return ROOMS.find((r) => r.value === value)?.label ?? value;
}

export function cabinetLabel(value: string) {
  return CABINETS.find((c) => c.value === value)?.label ?? value;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
