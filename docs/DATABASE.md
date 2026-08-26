# Database & auth — how the pieces fit

JobOS uses **Neon** for both the database and authentication, and that is one
decision rather than two.

Neon Auth is **Better Auth, hosted by Neon**, and it writes its tables into a
`neon_auth` schema *inside your own database*. Users, sessions and accounts are
ordinary rows you can join against — not records behind someone else's API.
So `owner_id` on every domain table is a real foreign key with a real
`ON DELETE CASCADE`, enforced by Postgres.

> Neon Auth used to be built on Stack Auth, which mirrored users into a
> `neon_auth.users_sync` table. It is Better Auth now, and the shape is
> different: `neon_auth.user`, `.session`, `.account`, plus the organization
> plugin. If you find guidance referring to `users_sync`, it is out of date.

## Who owns which schema

| Schema | Tables | Owned by | Migrated by |
| --- | --- | --- | --- |
| `neon_auth` | `user`, `session`, `account`, `verification`, `jwks`, `organization`, `member`, `invitation` | Neon Auth | Neon. Never us. |
| `public` | the 8 domain tables | JobOS | `drizzle/*.sql` |

`src/lib/db/neon-auth.ts` declares the two tables we read (`user`, `session`) so
joins are typed. It is deliberately **not** re-exported from `schema.ts`:
drizzle-kit generates DDL for every table reachable from the configured
entrypoint, and a migration containing `CREATE SCHEMA "neon_auth"` collides with
Neon's own provisioning the first time it runs. Keeping the module unreachable
makes that impossible rather than merely discouraged.

(`schemaFilter` in `drizzle.config.ts` does not prevent it — it filters
introspection and `push`, not `generate`. It is set anyway as a second line of
defence.)

## Setting it up from scratch

Everything below is CLI-only; nothing needs the Neon console.

**1 · Create a project** (or use an existing one) and note its id:

```bash
npx neonctl projects list --org-id <your-org>
```

**2 · Enable Auth on the branch.** This provisions the `neon_auth` schema and
prints the `base_url` you need:

```bash
npx neonctl neon-auth enable --project-id <id> --branch <branch>
```

Email + password is enabled by default, with email verification **not**
required — which is what lets a seeded demo account sign in immediately.

**3 · Collect the connection strings.** Two of them, for two different jobs:

```bash
npx neonctl connection-string production --project-id <id> --pooled   # DATABASE_URL
npx neonctl connection-string production --project-id <id>            # DATABASE_URL_UNPOOLED
```

The positional branch name must come *before* the flags, or the CLI reports
`Unknown command`.

**4 · Fill `.env.local`** from `.env.example`, including a cookie secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**5 · Apply the migrations.**

```bash
pnpm db:migrate                                        # drizzle/0000_initial.sql
node scripts/apply-sql.mjs drizzle/0001_owner_foreign_keys.sql
```

The second file is hand-written and applied separately on purpose — see below.

**6 · Seed the demo account** (optional but recommended):

```bash
pnpm db:seed
```

## Why the foreign keys are a separate migration

`drizzle/0001_owner_foreign_keys.sql` adds the `owner_id → neon_auth.user.id`
constraints. They cannot be part of `0000` because their target does not exist
until Auth is enabled, and `0000` has to stay generatable offline from the
schema file alone.

`scripts/apply-sql.mjs` applies it and is idempotent — re-running skips
constraints that already exist.

## Trusted origins

Neon Auth rejects sign-in requests from an origin it does not trust.
`allow_localhost` is on, so development works out of the box. Every deployed
origin has to be registered:

```bash
npx neonctl neon-auth domain add https://job.imswarnil.com \
  --project-id <id> --branch <branch>
npx neonctl neon-auth domain list --project-id <id> --branch <branch>
```

This is the first thing to check if sign-in works locally and fails in
production.

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
that id. Postgres backs it up: `owner_id` is a real FK, so a row cannot point
at a user who does not exist.

Admin queries (`src/lib/admin/queries.ts`) are the one deliberate exception —
they are instance-wide, which is why the *route* is the security boundary
there.

## The tables

| Table | Phase | Notes |
| --- | --- | --- |
| `company` | 1 | Unique on `(owner_id, name)` |
| `project` | 1 | `end_date` null means ongoing |
| `work_log` | 1 | The source of truth. Indexed on `(owner_id, occurred_on)` and `(owner_id, type)` |
| `resume_master` | 2 | One per owner. `data` is jsonb |
| `resume_version` | 2/3 | `job_id` set when tailored for a role |
| `job_criteria` | 4 | Saved searches the Phase 5 agent runs |
| `job` | 4 | Unique on `(owner_id, source, external_id)` |
| `application` | 4 | Records *which resume version* actually went out |

**`log_type` enum** — `work · learning · challenge · trick · setback · win`.
`company_id` is nullable on `work_log` precisely so a personal entry does not
have to be filed under an employer.

**`application_status` enum** — `found · tailored · applied · interview ·
offer · rejected · skipped`.

## Teams, later

Neon Auth already ships the Better Auth **organization plugin**, enabled:
`neon_auth.organization`, `member` and `invitation` exist and
`session.activeOrganizationId` is populated. Phase 6 does not have to build a
tenancy layer — it has to start reading the one that is already there. The
change lands in `scope()`, which starts returning
`{ ownerId, organizationId }`.
