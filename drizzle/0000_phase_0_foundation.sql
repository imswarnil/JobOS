CREATE TYPE "public"."application_status" AS ENUM('found', 'tailored', 'applied', 'interview', 'offer', 'rejected', 'skipped');--> statement-breakpoint
CREATE TABLE "application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"resume_version_id" uuid,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"applied_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"company" text,
	"url" text,
	"description" text,
	"posted_at" timestamp with time zone,
	"match_score" integer,
	"status" "application_status" DEFAULT 'found' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"location" text,
	"remote" boolean DEFAULT false NOT NULL,
	"min_salary" integer,
	"seniority" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_master" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"job_id" uuid,
	"label" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"date" date NOT NULL,
	"company_id" uuid,
	"project_id" uuid,
	"tasks" text NOT NULL,
	"challenges" text,
	"impact" text,
	"tech_tags" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"minutes_spent" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_resume_version_id_resume_version_id_fk" FOREIGN KEY ("resume_version_id") REFERENCES "public"."resume_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_log" ADD CONSTRAINT "work_log_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_log" ADD CONSTRAINT "work_log_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_owner_status_idx" ON "application" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "application_job_idx" ON "application" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "company_owner_idx" ON "company" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_owner_name_idx" ON "company" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "job_owner_status_idx" ON "job" USING btree ("owner_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "job_owner_source_external_idx" ON "job" USING btree ("owner_id","source","external_id");--> statement-breakpoint
CREATE INDEX "job_criteria_owner_idx" ON "job_criteria" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "project_owner_idx" ON "project" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "project_company_idx" ON "project" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_master_owner_idx" ON "resume_master" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "resume_version_owner_idx" ON "resume_version" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "resume_version_job_idx" ON "resume_version" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "work_log_owner_date_idx" ON "work_log" USING btree ("owner_id","date");--> statement-breakpoint
CREATE INDEX "work_log_project_idx" ON "work_log" USING btree ("project_id");