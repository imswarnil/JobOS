@AGENTS.md

# JobOS — working notes

A career operating system: log the work, build the resume, tailor it to the
role, track every application. See `docs/ABSTRACT.md` for the full premise and
`docs/ROADMAP.md` for the phase plan. `idea.md` is the original brief.

**Currently Phase 0.** The shell is real; the features are not. Read
`docs/ROADMAP.md` before adding anything — work belongs to a phase.

## Ground rules

**Authentication is deliberately off.** Every route is open and
`getCurrentUser()` in `src/lib/auth/index.ts` returns a fixed placeholder. Do
not "fix" this — it is how Phase 0 stays reviewable without a database. The
whole swap is documented in that file and in `docs/DATABASE.md`.

**Neon is both the database and the auth provider.** Neon Auth syncs users
into `neon_auth.users_sync` inside the same Postgres, so `owner_id` is an
ordinary foreign key. Do not add Auth.js, NextAuth or their adapter tables.

**`src/lib/db/neon-auth.ts` must never be re-exported from `schema.ts`.**
drizzle-kit generates DDL for every table it can reach from the schema
entrypoint, and a migration containing `CREATE SCHEMA "neon_auth"` collides
with Neon's own provisioning. Keeping it unreachable is the safeguard.

**Domain queries are always owner-scoped.** Use `scope()` from
`src/lib/auth/scope.ts`. There is one user; that is exactly why the habit
matters now.

**Nav and roadmap are data, not markup.** `src/lib/nav.ts` drives the sidebar,
the topbar title and the placeholders; `src/lib/phases.ts` drives every phase
badge, the dashboard roadmap and the auth aside. Edit those, not templates.

**`TODO(Phase N):`** marks every seam. `grep -rn "TODO(Phase" src/`

## Design language

Frame & Signal — the same system as the rest of imswarnil.com
(`../design.imswarnil.com`), reimplemented here as CSS variables rather than
consumed as a package, because this is a Tailwind app and that is a
dependency-free CSS system.

One departure: **JobOS runs a single typeface, Figtree.** Frame & Signal uses
three (Space Grotesk / Inter / IBM Plex Mono). The mono "slate" voice survives
as the `.t-slate` utility — uppercase, wide tracking, small.

Tokens live at the top of `src/app/globals.css` in two tiers:

1. **Primitive ramps** (`--ink-*`, `--signal-*`, `--amber-*`) — never used
   directly by a component.
2. **Semantic aliases** (`--bg-surface`, `--fg-muted`, `--accent`) — the only
   public names.

A `@theme inline` block bridges tier 2 into Tailwind, which is what lets
`bg-surface` / `text-fg-muted` / `border-line` work in both themes from one
set of classes. **Adding a colour = one alias + one bridge line.** Never write
a hex in a component, and never reach past an alias to a ramp step.

Vermilion (`--accent`) is the record light. It marks the live thing: the
active nav item, the primary action, the phase in progress. It is not
decoration — if three things on a screen are accent-coloured, two of them are
wrong.

## Commands

```bash
pnpm dev            # localhost:3000 — no database or keys needed
pnpm build
pnpm typecheck      # tsc --noEmit
pnpm lint
pnpm db:generate    # after editing src/lib/db/schema.ts
pnpm db:migrate     # needs DATABASE_URL
```

Both lint and typecheck must stay clean.

## Layout

`src/app/(app)/` is the application, `src/app/(auth)/` the sign-in screens,
`src/components/shell/` the sidebar and topbar, `src/lib/` everything that is
not a component. Full tree in `README.md`.
