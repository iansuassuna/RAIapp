CREATE TYPE "public"."activity_status" AS ENUM('concluida', 'em-andamento', 'pendente');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('capacitacao', 'curso', 'visita', 'projeto');--> statement-breakpoint
CREATE TYPE "public"."eixo" AS ENUM('inovacao', 'tecnico-sustentavel', 'tecnologias-saude');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planejamento', 'em-andamento', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."proposal_action" AS ENUM('criar', 'editar', 'excluir');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('pendente', 'aplicada', 'recusada');--> statement-breakpoint
CREATE TYPE "public"."request_kind" AS ENUM('componente', 'reuniao', 'autorizacao', 'verba', 'compra', 'outros', 'pedido');--> statement-breakpoint
CREATE TYPE "public"."request_progress" AS ENUM('em-uso', 'devolvido', 'agendada', 'realizada', 'ativa', 'expirada', 'revogada', 'aguardando-liberacao', 'liberada', 'prestacao-entregue', 'aguardando', 'feito');--> statement-breakpoint
CREATE TYPE "public"."request_reviewer" AS ENUM('coordenacao', 'diretoria');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pendente', 'aprovada', 'recusada');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('membro', 'coordenador', 'diretoria');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('a-fazer', 'em-andamento', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."member_time" AS ENUM('processos', 'midias');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"title" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"date" text NOT NULL,
	"status" "activity_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eixo_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"eixo" "eixo" NOT NULL,
	"title" text NOT NULL,
	"deadline" text NOT NULL,
	"status" "activity_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eixo_metrics" (
	"eixo" "eixo" PRIMARY KEY NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"goal" integer DEFAULT 100 NOT NULL,
	"activities_count" integer DEFAULT 0 NOT NULL,
	"processos_score" integer DEFAULT 0 NOT NULL,
	"midias_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle" text NOT NULL,
	"evaluator_id" text NOT NULL,
	"evaluatee_id" text NOT NULL,
	"ratings" jsonb NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluations_no_self_eval" CHECK ("evaluations"."evaluator_id" <> "evaluations"."evaluatee_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"cabinet" text NOT NULL,
	"owner_eixo" "eixo",
	"total" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_total_non_negative" CHECK ("inventory_items"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"proposer_id" text NOT NULL,
	"action" "proposal_action" NOT NULL,
	"item_id" text,
	"data" jsonb,
	"status" "proposal_status" DEFAULT 'pendente' NOT NULL,
	"resolved_by" text,
	"resolution_note" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" text PRIMARY KEY NOT NULL,
	"component_id" text NOT NULL,
	"member_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"request_id" text,
	"returned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loans_quantity_positive" CHECK ("loans"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_components" (
	"project_id" text NOT NULL,
	"component_id" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "project_components_project_id_component_id_pk" PRIMARY KEY("project_id","component_id"),
	CONSTRAINT "project_components_quantity_positive" CHECK ("project_components"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" text NOT NULL,
	"member_id" text NOT NULL,
	CONSTRAINT "project_members_project_id_member_id_pk" PRIMARY KEY("project_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"eixo" "eixo" NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "project_status" DEFAULT 'planejamento' NOT NULL,
	"start_date" text NOT NULL,
	"deadline" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_history" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"progress" "request_progress" NOT NULL,
	"by_member_id" text,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"eixo" "eixo" NOT NULL,
	"reviewer" "request_reviewer" NOT NULL,
	"project_id" text,
	"kind" "request_kind" NOT NULL,
	"details" jsonb NOT NULL,
	"meeting_date" text,
	"meeting_time" text,
	"meeting_room" text,
	"justification" text NOT NULL,
	"status" "request_status" DEFAULT 'pendente' NOT NULL,
	"progress" "request_progress",
	"resolved_by" text,
	"resolution_note" text,
	"resolved_at" timestamp,
	"purchase_item_id" text,
	"purchase_paid_value" double precision,
	"purchased_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"assignee_id" text,
	"deadline" text NOT NULL,
	"status" "task_status" DEFAULT 'a-fazer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'membro' NOT NULL,
	"eixo" "eixo",
	"time" "member_time",
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_eixo_time_check" CHECK (("user"."role" = 'membro' AND "user"."eixo" IS NOT NULL AND "user"."time" IS NOT NULL)
        OR ("user"."role" = 'coordenador' AND "user"."eixo" IS NOT NULL AND "user"."time" IS NULL)
        OR ("user"."role" = 'diretoria' AND "user"."eixo" IS NULL AND "user"."time" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_user_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatee_id_user_id_fk" FOREIGN KEY ("evaluatee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_proposals" ADD CONSTRAINT "inventory_proposals_proposer_id_user_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_proposals" ADD CONSTRAINT "inventory_proposals_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_proposals" ADD CONSTRAINT "inventory_proposals_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_component_id_inventory_items_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_request_id_resource_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_components" ADD CONSTRAINT "project_components_component_id_inventory_items_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_request_id_resource_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."resource_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_by_member_id_user_id_fk" FOREIGN KEY ("by_member_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_purchase_item_id_inventory_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "eixo_goals_eixo_idx" ON "eixo_goals" USING btree ("eixo");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_cycle_pair_unique" ON "evaluations" USING btree ("cycle","evaluator_id","evaluatee_id");--> statement-breakpoint
CREATE INDEX "evaluations_evaluatee_cycle_idx" ON "evaluations" USING btree ("evaluatee_id","cycle");--> statement-breakpoint
CREATE INDEX "inventory_proposals_status_idx" ON "inventory_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_proposals_proposer_idx" ON "inventory_proposals" USING btree ("proposer_id");--> statement-breakpoint
CREATE INDEX "loans_component_active_idx" ON "loans" USING btree ("component_id","returned_at");--> statement-breakpoint
CREATE INDEX "loans_request_idx" ON "loans" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "project_components_component_idx" ON "project_components" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "project_members_member_idx" ON "project_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "projects_eixo_idx" ON "projects" USING btree ("eixo");--> statement-breakpoint
CREATE INDEX "request_history_request_idx" ON "request_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "resource_requests_member_idx" ON "resource_requests" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "resource_requests_reviewer_eixo_idx" ON "resource_requests" USING btree ("reviewer","eixo","status");--> statement-breakpoint
CREATE INDEX "resource_requests_project_idx" ON "resource_requests" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "resource_requests_meeting_slot_idx" ON "resource_requests" USING btree ("meeting_date","meeting_time","meeting_room");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_one_coordinator_per_eixo" ON "user" USING btree ("eixo") WHERE "user"."role" = 'coordenador';--> statement-breakpoint
CREATE INDEX "user_eixo_idx" ON "user" USING btree ("eixo");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");