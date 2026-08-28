-- job_source.owner_id → neon_auth.user.id
--
-- Same reason as 001 and 002: the target table belongs to Neon Auth, so
-- drizzle-kit must not be able to reach it and therefore cannot generate
-- this. CASCADE because a watchlist is meaningless without the person whose
-- watchlist it is.

ALTER TABLE "job_source" ADD CONSTRAINT "job_source_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
