CREATE TYPE "public"."org_kind" AS ENUM('employer', 'client', 'education', 'personal');--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "kind" "org_kind" DEFAULT 'employer' NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "is_current" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "end_date" date;