CREATE TYPE "public"."score_source" AS ENUM('atividade', 'ajuste');--> statement-breakpoint
CREATE TABLE "evaluation_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_cycles_period_check" CHECK ("evaluation_cycles"."starts_on" <= "evaluation_cycles"."ends_on")
);
--> statement-breakpoint
CREATE TABLE "score_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"delta" integer NOT NULL,
	"source" "score_source" NOT NULL,
	"activity_id" text,
	"reason" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "score_entries_delta_check" CHECK ("score_entries"."delta" <> 0),
	CONSTRAINT "score_entries_reason_check" CHECK (length(trim("score_entries"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "date" SET DATA TYPE date USING "date"::date;--> statement-breakpoint
ALTER TABLE "eixo_goals" ALTER COLUMN "deadline" SET DATA TYPE date USING "deadline"::date;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "eixo_goals" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "eixo_goals" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "score_entries" ADD CONSTRAINT "score_entries_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_entries" ADD CONSTRAINT "score_entries_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_entries" ADD CONSTRAINT "score_entries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_cycles_starts_on_unique" ON "evaluation_cycles" USING btree ("starts_on");--> statement-breakpoint
CREATE INDEX "score_entries_member_idx" ON "score_entries" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "score_entries_activity_idx" ON "score_entries" USING btree ("activity_id");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eixo_goals" ADD CONSTRAINT "eixo_goals_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Dados: cria um ciclo mensal para cada rótulo já usado em "evaluations" ("Novembro/26" -> id "2026-11")
-- e aponta as avaliações para o id. Rótulo fora do formato deixa a FK abaixo falhar (migração aborta inteira).
INSERT INTO "evaluation_cycles" ("id", "label", "starts_on", "ends_on")
SELECT DISTINCT
	to_char(make_date(2000 + split_part(e."cycle", '/', 2)::int, m.num, 1), 'YYYY-MM'),
	e."cycle",
	make_date(2000 + split_part(e."cycle", '/', 2)::int, m.num, 1),
	(make_date(2000 + split_part(e."cycle", '/', 2)::int, m.num, 1) + interval '1 month' - interval '1 day')::date
FROM "evaluations" e
JOIN (VALUES ('Janeiro', 1), ('Fevereiro', 2), ('Março', 3), ('Abril', 4), ('Maio', 5), ('Junho', 6),
	('Julho', 7), ('Agosto', 8), ('Setembro', 9), ('Outubro', 10), ('Novembro', 11), ('Dezembro', 12)) AS m(name, num)
	ON split_part(e."cycle", '/', 1) = m.name
WHERE e."cycle" ~ '^[^/]+/[0-9]{2}$'
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "evaluations" e SET "cycle" = c."id" FROM "evaluation_cycles" c WHERE e."cycle" = c."label";--> statement-breakpoint
-- Dados: saldo inicial no ledger para manter user.score = SUM(score_entries.delta) desde o início.
INSERT INTO "score_entries" ("id", "member_id", "delta", "source", "reason")
SELECT 'se-init-' || u."id", u."id", u."score", 'ajuste', 'Saldo inicial (antes do histórico de pontuação)'
FROM "user" u
WHERE u."score" <> 0
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_cycle_evaluation_cycles_id_fk" FOREIGN KEY ("cycle") REFERENCES "public"."evaluation_cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_member_date_idx" ON "activities" USING btree ("member_id","date");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_points_check" CHECK ("activities"."points" >= 0 AND "activities"."points" <= 100);