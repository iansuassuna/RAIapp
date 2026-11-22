import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["membro", "coordenador", "diretoria"]);

export const eixoEnum = pgEnum("eixo", ["inovacao", "tecnico-sustentavel", "tecnologias-saude"]);

export const timeEnum = pgEnum("member_time", ["processos", "midias"]);

export const activityTypeEnum = pgEnum("activity_type", ["capacitacao", "curso", "visita", "projeto"]);

export const activityStatusEnum = pgEnum("activity_status", ["concluida", "em-andamento", "pendente"]);

export const projectStatusEnum = pgEnum("project_status", ["planejamento", "em-andamento", "concluido"]);

export const taskStatusEnum = pgEnum("task_status", ["a-fazer", "em-andamento", "concluida"]);

export const proposalActionEnum = pgEnum("proposal_action", ["criar", "editar", "excluir"]);

export const proposalStatusEnum = pgEnum("proposal_status", ["pendente", "aplicada", "recusada"]);

export const requestKindEnum = pgEnum("request_kind", [
  "componente",
  "reuniao",
  "autorizacao",
  "verba",
  "compra",
  "outros",
  "pedido",
]);

export const requestReviewerEnum = pgEnum("request_reviewer", ["coordenacao", "diretoria"]);

export const requestStatusEnum = pgEnum("request_status", ["pendente", "aprovada", "recusada"]);

export const requestProgressEnum = pgEnum("request_progress", [
  "em-uso",
  "devolvido",
  "agendada",
  "realizada",
  "ativa",
  "expirada",
  "revogada",
  "aguardando-liberacao",
  "liberada",
  "prestacao-entregue",
  "aguardando",
  "feito",
]);
