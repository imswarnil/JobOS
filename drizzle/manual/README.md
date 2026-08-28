# Hand-written migrations

drizzle-kit cannot generate these, and it must not renumber around them —
which is exactly what happened the first time they shared a directory, when a
generated `0001` collided with a hand-written `0001`.

They live here, outside drizzle-kit's numbering entirely, and are applied with:

```bash
node scripts/apply-sql.mjs drizzle/manual/<file>.sql
```

The script is idempotent — re-running skips anything already present — so it is
safe to apply the whole directory after any `pnpm db:migrate`.

| File | Why it cannot be generated |
| --- | --- |
| `001_owner_foreign_keys.sql` | Targets `neon_auth.user`, a table Neon Auth provisions. Drizzle must not reach that schema, or every generated migration tries to `CREATE SCHEMA "neon_auth"`. |
| `002_llm_usage_owner_fk.sql` | Same, for the `llm_usage` table added later. |
| `003_job_source_owner_fk.sql` | Same, for the `job_source` watchlist added in Phase 4. |
