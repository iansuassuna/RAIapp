import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InventoryItemInput, RequestDetails } from "@/types";
import { user } from "./auth";
import {
  activityStatusEnum,
  activityTypeEnum,
  eixoEnum,
  notificationTypeEnum,
  projectStatusEnum,
  proposalActionEnum,
  proposalStatusEnum,
  requestKindEnum,
  requestProgressEnum,
  requestReviewerEnum,
  requestStatusEnum,
  scoreSourceEnum,
  taskStatusEnum,
} from "./enums";

/* ---------- Projetos & Tarefas ---------- */

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    eixo: eixoEnum("eixo").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: projectStatusEnum("status").notNull().default("planejamento"),
    startDate: text("start_date").notNull(),
    deadline: text("deadline").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("projects_eixo_idx").on(table.eixo)],
);

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.memberId] }),
    index("project_members_member_idx").on(table.memberId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    deadline: text("deadline").notNull(),
    status: taskStatusEnum("status").notNull().default("a-fazer"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("tasks_project_idx").on(table.projectId), index("tasks_assignee_idx").on(table.assigneeId)],
);

/* ---------- Inventário & Propostas ---------- */

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    cabinet: text("cabinet").notNull(),
    ownerEixo: eixoEnum("owner_eixo"),
    total: integer("total").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [check("inventory_items_total_non_negative", sql`${table.total} >= 0`)],
);

export const projectComponents = pgTable(
  "project_components",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    componentId: text("component_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.componentId] }),
    check("project_components_quantity_positive", sql`${table.quantity} > 0`),
    index("project_components_component_idx").on(table.componentId),
  ],
);

export const inventoryProposals = pgTable(
  "inventory_proposals",
  {
    id: text("id").primaryKey(),
    proposerId: text("proposer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: proposalActionEnum("action").notNull(),
    itemId: text("item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
    data: jsonb("data").$type<InventoryItemInput | null>(),
    status: proposalStatusEnum("status").notNull().default("pendente"),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("inventory_proposals_status_idx").on(table.status),
    index("inventory_proposals_proposer_idx").on(table.proposerId),
  ],
);

/* ---------- Requisições & Empréstimos ---------- */

export const resourceRequests = pgTable(
  "resource_requests",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eixo: eixoEnum("eixo").notNull(),
    reviewer: requestReviewerEnum("reviewer").notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    kind: requestKindEnum("kind").notNull(),
    details: jsonb("details").$type<RequestDetails>().notNull(),
    meetingDate: text("meeting_date"),
    meetingTime: text("meeting_time"),
    meetingRoom: text("meeting_room"),
    justification: text("justification").notNull(),
    status: requestStatusEnum("status").notNull().default("pendente"),
    progress: requestProgressEnum("progress"),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at"),
    purchaseItemId: text("purchase_item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
    purchasePaidValue: doublePrecision("purchase_paid_value"),
    purchasedAt: timestamp("purchased_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("resource_requests_member_idx").on(table.memberId),
    index("resource_requests_reviewer_eixo_idx").on(table.reviewer, table.eixo, table.status),
    index("resource_requests_project_idx").on(table.projectId),
    index("resource_requests_meeting_slot_idx").on(table.meetingDate, table.meetingTime, table.meetingRoom),
  ],
);

export const requestHistory = pgTable(
  "request_history",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => resourceRequests.id, { onDelete: "cascade" }),
    progress: requestProgressEnum("progress").notNull(),
    byMemberId: text("by_member_id").references(() => user.id, { onDelete: "set null" }),
    at: timestamp("at").notNull().defaultNow(),
  },
  (table) => [index("request_history_request_idx").on(table.requestId)],
);

export const loans = pgTable(
  "loans",
  {
    id: text("id").primaryKey(),
    componentId: text("component_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "restrict" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    requestId: text("request_id").references(() => resourceRequests.id, { onDelete: "set null" }),
    returnedAt: timestamp("returned_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("loans_quantity_positive", sql`${table.quantity} > 0`),
    index("loans_component_active_idx").on(table.componentId, table.returnedAt),
    index("loans_request_idx").on(table.requestId),
  ],
);

/* ---------- Avaliação Cruzada ---------- */

/**
 * Ciclos de avaliação por data (um por mês, criados automaticamente). O ciclo vigente é o que cobre a data
 * de hoje — nenhum status é gravado. `id` = "AAAA-MM" do mês de criação; `label` é o rótulo exibido.
 * Períodos não se sobrepõem (validado em transação em `lib/api/cycles.ts`).
 */
export const evaluationCycles = pgTable(
  "evaluation_cycles",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("evaluation_cycles_period_check", sql`${table.startsOn} <= ${table.endsOn}`),
    uniqueIndex("evaluation_cycles_starts_on_unique").on(table.startsOn),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: text("id").primaryKey(),
    cycle: text("cycle")
      .notNull()
      .references(() => evaluationCycles.id, { onDelete: "restrict" }),
    evaluatorId: text("evaluator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    evaluateeId: text("evaluatee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ratings: jsonb("ratings").$type<Record<string, number>>().notNull(),
    comment: text("comment").notNull().default(""),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("evaluations_cycle_pair_unique").on(table.cycle, table.evaluatorId, table.evaluateeId),
    check("evaluations_no_self_eval", sql`${table.evaluatorId} <> ${table.evaluateeId}`),
    index("evaluations_evaluatee_cycle_idx").on(table.evaluateeId, table.cycle),
  ],
);

/* ---------- Atividades, Pontuação e Metas ---------- */

/**
 * Atividade de um membro (capacitação, curso, visita, projeto). Registrada pela coordenação do eixo
 * ou pela diretoria. Pontos só contam quando `status = 'concluida'` (lançados em `score_entries`).
 * `member_id` nulo = registro legado sem dono: não aparece nem conta para ninguém.
 */
export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id").references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: activityTypeEnum("type").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    status: activityStatusEnum("status").notNull(),
    points: integer("points").notNull().default(0),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("activities_points_check", sql`${table.points} >= 0 AND ${table.points} <= 100`),
    index("activities_member_date_idx").on(table.memberId, table.date),
  ],
);

/**
 * Histórico (ledger) da pontuação. `user.score` é sempre `SUM(delta)` deste membro e é atualizado na
 * mesma transação de cada lançamento. Nada é apagado: correções geram lançamentos de estorno.
 */
export const scoreEntries = pgTable(
  "score_entries",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    source: scoreSourceEnum("source").notNull(),
    activityId: text("activity_id").references(() => activities.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("score_entries_delta_check", sql`${table.delta} <> 0`),
    check("score_entries_reason_check", sql`length(trim(${table.reason})) > 0`),
    index("score_entries_member_idx").on(table.memberId, table.createdAt),
    index("score_entries_activity_idx").on(table.activityId),
  ],
);

export const eixoGoals = pgTable(
  "eixo_goals",
  {
    id: text("id").primaryKey(),
    eixo: eixoEnum("eixo").notNull(),
    title: text("title").notNull(),
    deadline: date("deadline", { mode: "string" }).notNull(),
    status: activityStatusEnum("status").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("eixo_goals_eixo_idx").on(table.eixo)],
);

/* ---------- Notificações ---------- */

/**
 * Central de notificações. Gravadas na MESMA transação do evento que as gera (`notify()` em
 * `lib/api/notifications.ts`) e entregues em tempo real via `pg_notify` + SSE após o commit.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(table.recipientId, table.createdAt),
    index("notifications_unread_idx").on(table.recipientId).where(sql`${table.readAt} is null`),
  ],
);
