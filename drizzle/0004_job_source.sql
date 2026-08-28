CREATE TYPE "public"."job_source_kind" AS ENUM('greenhouse', 'lever', 'careerpage');--> statement-breakpoint
CREATE TABLE "job_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "job_source_kind" NOT NULL,
	"label" text NOT NULL,
	"target" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "remote" boolean;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "salary_max" integer;--> statement-breakpoint
CREATE INDEX "job_source_owner_enabled_idx" ON "job_source" USING btree ("owner_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "job_source_owner_kind_target_idx" ON "job_source" USING btree ("owner_id","kind","target");