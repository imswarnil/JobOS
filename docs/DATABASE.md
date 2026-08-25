# Database & auth — how the pieces fit

JobOS uses **Neon** for both the database and authentication. That is a
deliberate choice rather than a convenience: Neon Auth syncs the identity
provider's users into a `neon_auth.users_sync` table **inside the same
Postgres**, so "who owns this row" is answerable in SQL rather than over an
API. There are no `accounts` / `sessions` / `verification_tokens` tables of our
own to maintain — Neon owns those.

## Who owns which schema

| Schema | Owned by | Migrated by |
| --- | --- | --- |
| `neon_auth` | Neon Auth | Neon. Never us. |
| `public` | JobOS | `drizzle/*.sql` |

`src/lib/db/neon-auth.ts` declares `users_sync` so joins are typed. It is
deliberately **not** re-exported from `schema.ts`: drizzle-kit generates DDL
for every table reachable from the configured entrypoint, and a migration
containing `CREATE SCHEMA "neon_auth"` would collide with Neon's own
provisioning the first time it ran. Keeping the table unreachable makes that
impossible rather than merely discouraged.

(`schemaFilter` in `drizzle.config.ts` does not prevent this — it filters
introspection and `push`, not `generate`. It is set anyway, as a second line
of defence for `push` and `studio`.)

## Phase 0 state

Nothing is connected. The schema is defined and the migration is generated, but
no database exists and no screen queries one.

## Turning it on (Phase 1)

**1 · Create the Neon project** and copy the *pooled* connection string
(the host containing `-pooler`) into `.env.local` as `DATABASE_URL`.

**2 · Apply the migration.**

```bash
pnpm db:migrate        # applies drizzle/*.sql
```

**3 · Enable Auth** in the Neon console. It provisions `neon_auth.users_sync`
and hands you the three Stack keys for `.env.local`.

**4 · Add the ownership foreign keys.** These could not be part of the initial
migration, because their target table did not exist yet. Run once, after Auth
is enabled:

```sql
ALTER TABLE "company"        ADD CONSTRAINT "company_owner_fk"        FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
ALTER TABLE "project"        ADD CONSTRAINT "project_owner_fk"        FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
ALTER TABLE "work_log"       ADD CONSTRAINT "work_log_owner_fk"       FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
ALTER TABLE "resume_master"  ADD CONSTRAINT "resume_master_owner_fk"  FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
ALTER TABLE "job_criteria"   ADD CONSTRAINT "job_criteria_owner_fk"   FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
ALTER TABLE "job"            ADD CONSTRAINT "job_owner_fk"            FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
ALTER TABLE "application"    ADD CONSTRAINT "application_owner_fk"    FOREIGN KEY ("owner_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE;
```

Save it as `drizzle/0001_owner_foreign_keys.sql` so it runs with everything
else.

**5 · Replace the placeholder** in `src/lib/auth/index.ts` with the real Stack
session read, and make `requireUser()` redirect.

## The scoping rule

Never query a domain table without an owner filter:

```ts
// wrong — works today, leaks on the day a second user exists
await db.select().from(workLog);

// right
const { ownerId } = await scope();
await db.select().from(workLog).where(eq(workLog.ownerId, ownerId));
```

`scope()` lives in `src/lib/auth/scope.ts` and is the only sanctioned source of
that id. When organizations arrive in Phase 6 it starts returning
`{ ownerId, organizationId }` and callers that destructure it keep working.

## The tables

| Table | Phase | Notes |
| --- | --- | --- |
| `company` | 1 | Unique on `(owner_id, name)` |
| `project` | 1 | `end_date` null means ongoing |
| `work_log` | 1 | The source of truth. Indexed on `(owner_id, date)` |
| `resume_master` | 2 | One per owner. `data` is jsonb |
| `resume_version` | 2/3 | `job_id` set when tailored for a role |
| `job_criteria` | 4 | Saved searches the Phase 5 agent runs |
| `job` | 4 | Unique on `(owner_id, source, external_id)` |
| `application` | 4 | Records *which resume version* actually went out |

`application_status` enum: `found · tailored · applied · interview · offer ·
rejected · skipped`.
