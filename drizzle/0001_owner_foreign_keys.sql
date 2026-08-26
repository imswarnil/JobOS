-- Ownership foreign keys.
--
-- These are not in 0000 because their target, `neon_auth.user`, is provisioned
-- by Neon Auth rather than by our migrations — the table does not exist until
-- Auth is enabled on the branch. Splitting them out keeps 0000 generatable
-- offline and keeps `neon_auth` out of drizzle-kit's reach entirely.
--
-- ON DELETE CASCADE is deliberate: deleting an account must take the whole
-- career record with it. That is the promise made in Settings.

ALTER TABLE "company"        ADD CONSTRAINT "company_owner_fk"        FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project"        ADD CONSTRAINT "project_owner_fk"        FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "work_log"       ADD CONSTRAINT "work_log_owner_fk"       FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_master"  ADD CONSTRAINT "resume_master_owner_fk"  FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_criteria"   ADD CONSTRAINT "job_criteria_owner_fk"   FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job"            ADD CONSTRAINT "job_owner_fk"            FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "application"    ADD CONSTRAINT "application_owner_fk"    FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
