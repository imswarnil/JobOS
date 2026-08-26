-- llm_usage.owner_id → neon_auth.user.id
--
-- Same reason as 001: the target belongs to Neon Auth, so Drizzle must not
-- reach it and cannot generate this. CASCADE because a deleted account should
-- take its usage ledger with it — the rows exist to rate-limit a person who
-- no longer exists.

ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
