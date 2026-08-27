@AGENTS.md

# JobOS — working notes

A career operating system: log the work, build the resume, tailor it to the
role, track every application. See `docs/ABSTRACT.md` for the premise and
`docs/ROADMAP.md` for the phase plan. `idea.md` is the original brief.

**Phase 0 shipped. Phase 1 in progress.** The journal is real; resume, jobs and
applications are still placeholders. Read the roadmap before adding anything —
work belongs to a phase.

## Ground rules

**Neon is the database *and* the auth provider.** Neon Auth is **Better Auth,
hosted by Neon**, writing `user` / `session` / `account` into a `neon_auth`
schema inside the same Postgres. Do not add Auth.js, NextAuth or an adapter.

> It used to be Stack Auth with a `users_sync` mirror table. It is not any
> more. Anything referring to `users_sync` is stale.

**`src/lib/db/neon-auth.ts` must never be re-exported from `schema.ts`.**
drizzle-kit generates DDL for every table reachable from the schema
entrypoint, and a migration containing `CREATE SCHEMA "neon_auth"` collides
with Neon's own provisioning. `schemaFilter` does *not* prevent this — it
filters introspection and `push`, not `generate`. Unreachability is the
safeguard.

**Two connection strings, two jobs.** `DATABASE_URL` is pooled and used at
runtime; `DATABASE_URL_UNPOOLED` is direct and used by drizzle-kit, because
PgBouncer does not reliably carry the session state DDL needs.

**Domain queries are always owner-scoped.** Use `scope()` from
`src/lib/auth/scope.ts`; `owner_id` is a real FK to `neon_auth.user.id`. The
single exception is `src/lib/admin/queries.ts`, which is instance-wide by
design — which is why the *route* is the boundary there.

**Writes are server actions**, never API routes. The owner comes from the
session, never from the form, and deletes carry the owner in the WHERE clause.

**Any route reading a session needs `export const dynamic = "force-dynamic"`**
or Next will prerender one visitor's account into static output.

**Models are local-first, and that is policy rather than a default.** The
chain is `anythingllm, ollama, gemini, groq` (`src/lib/llm/providers.ts`),
tried in order until one answers. What travels through this seam is a whole
work history plus every role someone is quietly considering, so self-hosted
inference gets first refusal; the hosted keys are the safety net for when the
box is unreachable. A configured-but-down local provider is not an error — it
fails and the chain moves on, which is what makes a localhost URL safe to
leave set in production.

The rate limit follows from the same reasoning: it exists to protect a shared
paid key, so **only hosted calls count against it** (`src/lib/llm/limit.ts`),
and it lifts entirely when every configured provider is self-hosted. An
unsettled row reads as `pending`, which counts — deliberately, so a looping
call cannot slip past while in flight.

**The resume assistant proposes; it never writes.** Every action in
`src/lib/resume/ai-actions.ts` returns a suggestion the author accepts by
hand, and the existing `saveItemAction` / `saveBasicsAction` do the storing.
Grounding is enforced twice: the prompts get a closed evidence set from
`src/lib/journal/evidence.ts`, and `unsupportedNumbers` flags any figure the
sources do not vouch for. `src/lib/resume/lint.ts` handles everything a regex
can catch — instantly, in the browser, with no model call — so the model is
only ever spent on judgement.

**Nav, roadmap and homepage are data**, not markup: `src/lib/nav.ts`,
`src/lib/phases.ts`, `src/lib/marketing.ts`. Shipping a phase means editing
`phases.ts`, not sweeping templates. The sidebar chip reads whichever phase has
`status: "building"`.

**Trusted origins.** Neon Auth rejects sign-in from unregistered origins.
Localhost is allowed; every deployed origin needs
`neonctl neon-auth domain add`. First thing to check when auth works locally
and fails in production.

**`TODO(Phase N):`** marks every seam. `grep -rn "TODO(Phase" src/`

## The journal's shape

Six log types — `work`, `learning`, `challenge`, `trick`, `setback`, `win` —
defined in the `log_type` enum and given labels, icons, tones and composer
prompts in `src/lib/journal/types.ts`. Adding a type means the enum (a
migration), that file, and nothing else.

`company_id` is nullable on `work_log` on purpose: plenty of what makes someone
better happens nowhere near an employer, and a personal entry must not have to
be filed under a job. The UI labels those "Personal".

## Design language

Frame & Signal — the same system as the rest of imswarnil.com
(`../design.imswarnil.com`), reimplemented here as CSS variables rather than
consumed as a package, because this is a Tailwind app and that is a
dependency-free CSS system.

Two departures. **A single typeface, Figtree** — the mono "slate" voice
survives as the `.t-slate` utility, uppercase and wide-tracked. And a second
chromatic voice, **zest**, which Frame & Signal does not have: green, used for
anything a model touched and anything worth being pleased about. Vermilion
still owns "live" and nothing competes with it for that, which is what lets
zest be loud.

Radii are rounder than the parent system and every duration is faster
(90/140/240/420ms). Both are deliberate: this is a tool someone opens on a
Sunday evening, and a 200ms hover reads as lag.

Tokens live at the top of `src/app/globals.css` in two tiers:

1. **Primitive ramps** (`--ink-*`, `--signal-*`, `--amber-*`) — never used
   directly by a component.
2. **Semantic aliases** (`--bg-surface`, `--fg-muted`, `--accent`) — the only
   public names.

A `@theme inline` block bridges tier 2 into Tailwind. **Adding a colour = one
alias + one bridge line.** Never a hex in a component, never a ramp step.

Vermilion (`--accent`) is the record light: the active nav item, the primary
action, the phase in progress. Three accent-coloured things on a screen means
two are wrong.

## Commands

```bash
pnpm dev          # needs a real .env.local — there is no offline mode
pnpm stop         # kill this project's servers only — see below
pnpm dev:clean    # stop, then dev
pnpm build
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm db:generate  # after editing src/lib/db/schema.ts
pnpm db:migrate
pnpm db:seed      # demo account + 15 entries across all six types
```

Both lint and typecheck must stay clean. Two lint rules bite often:
`react-hooks/set-state-in-effect` (adjust state during render instead — see
`app-shell.tsx` and `entry-composer.tsx`) and unused args (prefix `_`).

## Stopping the local servers

`pnpm stop` (`scripts/stop.sh`) kills the dev server, `next start`, drizzle
studio and their `pnpm` wrappers, then frees 3000, 3001 and 4983.

It only kills a process whose **working directory is this repo**. That is the
whole point: a sibling Next app — sometimes under a different macOS account —
holds :3000 on this machine, which is why `pnpm dev` keeps landing on 3001.
Those are reported, never killed. `--force` overrides for same-user processes;
it cannot cross accounts without sudo.

`lsof` only sees sockets owned by the user running it, so a port held by
another account looks free to it. The script falls back to `netstat` for that
case — otherwise a busy port reads as available and the failure surfaces much
later as Next silently choosing a different port.

## Gotchas already paid for

- `neonctl connection-string <branch>` needs the branch **before** the flags,
  or it reports `Unknown command`.
- Seeding through the auth API needs an `Origin` header Neon trusts.
- Interpolating a Drizzle column into a raw `sql` correlated subquery silently
  returns 0. Use a `leftJoin` + `groupBy`.
- Lucide v1 dropped brand icons — the GitHub mark is inline SVG.
