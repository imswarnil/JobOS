/**
 * Seeds the demo account.
 *
 * Creates the demo user through the Neon Auth HTTP API (so the password is
 * hashed by Better Auth exactly as a real sign-up would be — we never write
 * to `neon_auth` ourselves), then fills its journal with entries across all
 * six log types.
 *
 * Idempotent: re-running replaces the demo user's journal rather than
 * duplicating it, and leaves every other account untouched.
 *
 *   node scripts/seed.mjs
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const {
  DATABASE_URL_UNPOOLED,
  DATABASE_URL,
  NEON_AUTH_BASE_URL,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_NAME,
} = process.env;

for (const [k, v] of Object.entries({
  DATABASE_URL,
  NEON_AUTH_BASE_URL,
  DEMO_EMAIL,
  DEMO_PASSWORD,
})) {
  if (!v) {
    console.error(`Missing ${k} — see .env.example.`);
    process.exit(1);
  }
}

const sql = neon(DATABASE_URL_UNPOOLED ?? DATABASE_URL);

/* ── 1 · the demo user ───────────────────────────────────────────────────── */

async function ensureDemoUser() {
  const existing = await sql`
    SELECT id FROM neon_auth."user" WHERE email = ${DEMO_EMAIL} LIMIT 1`;
  if (existing.length) {
    console.log(`· demo user already exists (${DEMO_EMAIL})`);
    return existing[0].id;
  }

  const res = await fetch(`${NEON_AUTH_BASE_URL}/sign-up/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Better Auth requires an Origin it trusts. `allow_localhost` is on for
      // this project, so the dev origin is accepted; override with APP_ORIGIN
      // when seeding against a deployed environment.
      origin: process.env.APP_ORIGIN ?? "http://localhost:3000",
    },
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      name: DEMO_NAME ?? "Demo User",
    }),
  });

  if (!res.ok) {
    console.error(`Sign-up failed (${res.status}): ${await res.text()}`);
    process.exit(1);
  }

  const rows = await sql`
    SELECT id FROM neon_auth."user" WHERE email = ${DEMO_EMAIL} LIMIT 1`;
  if (!rows.length) {
    console.error("Sign-up reported success but no user row appeared.");
    process.exit(1);
  }
  console.log(`✓ created demo user ${DEMO_EMAIL}`);
  return rows[0].id;
}

/* ── 2 · companies and projects ──────────────────────────────────────────── */

const COMPANIES = [
  { key: "northwind", name: "Northwind Logistics", notes: "Current role. Salesforce + integrations." },
  { key: "brightpath", name: "BrightPath Consulting", notes: "Previous role. Implementation partner." },
];

const PROJECTS = [
  { key: "fleet", company: "northwind", name: "Fleet Console", description: "Internal dispatcher tooling.", start: "2026-01-12", end: null },
  { key: "billing", company: "northwind", name: "Billing Migration", description: "Moving invoicing off the legacy batch job.", start: "2025-09-01", end: "2026-02-28" },
  { key: "onboard", company: "brightpath", name: "Client Onboarding Revamp", description: "Cut setup time for new clients.", start: "2024-06-03", end: "2025-07-31" },
];

/* ── 3 · the journal ─────────────────────────────────────────────────────── */

/** `daysAgo` keeps the seed relative, so the demo never looks stale. */
const ENTRIES = [
  {
    daysAgo: 0, type: "work", project: "fleet", company: "northwind",
    title: "Split the dispatcher board into virtualised rows",
    body: "The board rendered all 1,400 active shipments on every filter change. Swapped the list for a windowed renderer that only mounts what is on screen, and moved the filter state into the URL so a reload keeps your view.",
    challenges: "The row heights are not uniform — a shipment with exceptions renders taller — so a fixed-height virtual list snapped rows to the wrong offsets. Had to measure and cache heights per row.",
    impact: "Filter changes went from ~2.4s to under 200ms. Dispatchers stopped keeping two tabs open to avoid re-filtering.",
    tech: ["react", "typescript", "tanstack-virtual"], tags: ["performance", "frontend"], minutes: 260,
  },
  {
    daysAgo: 0, type: "trick", company: null, project: null,
    title: "psql \\watch turns any query into a live dashboard",
    body: "Ending a query with \\watch 2 in psql re-runs it every two seconds and redraws in place. Pointed it at a count of rows in the migration backlog table and watched the number drain instead of hammering the enter key.",
    impact: "Replaced a browser tab and a hand-rolled polling script with one line of psql.",
    tech: ["postgres", "psql"], tags: ["tooling", "database"], minutes: 10,
  },
  {
    daysAgo: 1, type: "learning", company: null, project: null,
    title: "Postgres indexes do not help a query that does not filter on them",
    body: "Spent an hour confused that an index on (owner_id, created_at) was being ignored. It was ignored because the query filtered on owner_id and ordered by updated_at — a different column. The planner was right and I was wrong.",
    impact: "Learned to read EXPLAIN ANALYZE before adding a second index rather than after.",
    tech: ["postgres"], tags: ["database", "debugging"], minutes: 65,
  },
  {
    daysAgo: 2, type: "challenge", project: "billing", company: "northwind",
    title: "Legacy invoices round differently to the new engine",
    body: "About 0.4% of migrated invoices are off by one cent. The old batch job rounded each line item then summed; the new engine sums then rounds. Both are defensible, only one matches what customers were already invoiced.",
    challenges: "Cannot simply adopt the old behaviour — finance wants sum-then-round going forward. Need a cutover date where the rule changes, and to prove no historical invoice is restated.",
    tech: ["typescript", "postgres"], tags: ["billing", "data-migration"], minutes: 180,
  },
  {
    daysAgo: 3, type: "setback", project: "fleet", company: "northwind",
    title: "Shipped a migration that locked the shipments table for 40 seconds",
    body: "Added a NOT NULL column with a default to a 12M-row table during business hours. Postgres rewrote the whole table and took an ACCESS EXCLUSIVE lock. Dispatch was down for 40 seconds and I found out from Slack, not from monitoring.",
    challenges: "I had tested it on a branch with 4,000 rows, where the rewrite was instant and invisible.",
    impact: "Wrote it up for the team. Now: add nullable, backfill in batches, then set NOT NULL — and test migrations against a branch with production-scale row counts.",
    tech: ["postgres", "drizzle"], tags: ["incident", "database"], minutes: 95,
  },
  {
    daysAgo: 4, type: "win", project: "billing", company: "northwind",
    title: "Cut the nightly billing run from 3 hours to 18 minutes",
    body: "The nightly job re-fetched the customer record once per line item. Batched the lookups into one query per run and cached the tier rules in memory for the duration of the job.",
    impact: "3h04m to 18m. The run now finishes before the finance team logs in, so month-end stopped starting with a wait.",
    tech: ["typescript", "postgres"], tags: ["performance", "billing"], minutes: 210,
  },
  {
    daysAgo: 6, type: "learning", company: null, project: null,
    title: "Reading a flame graph properly",
    body: "Worked through a profiling course section on flame graphs. The width is total time in a frame including children; depth is just call nesting, not cost. I had been reading tall stacks as expensive when the actually expensive thing was one wide shallow frame near the bottom.",
    tech: ["profiling", "nodejs"], tags: ["learning", "performance"], minutes: 90,
  },
  {
    daysAgo: 7, type: "trick", company: null, project: null,
    title: "git bisect run makes regression hunting mechanical",
    body: "Instead of bisecting by hand, `git bisect run ./script.sh` walks the range automatically — the script exits 0 for good and 1 for bad. Found the commit that broke shipment ETAs across 60 commits in about two minutes.",
    impact: "Turned an afternoon of manual checkouts into a coffee break.",
    tech: ["git"], tags: ["tooling", "debugging"], minutes: 25,
  },
  {
    daysAgo: 9, type: "work", project: "fleet", company: "northwind",
    title: "Added exception reasons to the shipment timeline",
    body: "Dispatchers could see that a shipment was flagged but not why without opening the record. Surfaced the reason code and the free-text note inline on the timeline, grouped by the hour they were raised.",
    impact: "Support ticket volume asking 'why is this flagged' dropped noticeably in the first week.",
    tech: ["react", "typescript"], tags: ["frontend", "ux"], minutes: 190,
  },
  {
    daysAgo: 12, type: "challenge", company: null, project: null,
    title: "Side project: deciding how much of the resume the model may rewrite",
    body: "Building a tool that tailors a resume to a job description. The tension: too literal and it just reorders bullet points; too free and it starts inventing metrics I never earned. Currently leaning towards giving the model a fixed set of facts and forbidding anything outside it.",
    challenges: "Hard to evaluate. 'Did it lie?' is not something a unit test answers, so I need a grounding check that compares every claim back to a source entry.",
    tech: ["typescript", "llm"], tags: ["side-project", "ai"], minutes: 150,
  },
  {
    daysAgo: 14, type: "win", project: "onboard", company: "brightpath",
    title: "Onboarding revamp shipped — setup time down from 9 days to 2",
    body: "Replaced a 40-field manual setup form with a guided flow that derives most values from the client's existing org and only asks about genuine ambiguities.",
    impact: "Median client setup went from 9 days to 2. Became the default flow for every new client that quarter.",
    tech: ["salesforce", "apex"], tags: ["delivery", "ux"], minutes: 320,
  },
  {
    daysAgo: 18, type: "setback", company: null, project: null,
    title: "Talked myself out of applying to a role I was qualified for",
    body: "Saw a posting that matched almost everything I do day to day, decided I was short on one bullet, and did not apply. It was filled two weeks later.",
    challenges: "The missing bullet was a framework I have shipped twice, just not under that name. I could not see it because I had no written record to check against.",
    impact: "This is exactly why I am building a journal. Next time I check the record instead of my memory.",
    tags: ["career", "reflection"], minutes: 20,
  },
  {
    daysAgo: 21, type: "trick", company: null, project: null,
    title: "EXPLAIN (ANALYZE, BUFFERS) is the one you actually want",
    body: "Plain EXPLAIN ANALYZE gives timings; adding BUFFERS shows how many blocks came from cache versus disk. A query that looks slow is often just cold, and the fix is a warm cache or a smaller working set, not a new index.",
    tech: ["postgres"], tags: ["database", "performance"], minutes: 30,
  },
  {
    daysAgo: 24, type: "learning", project: "billing", company: "northwind",
    title: "Idempotency keys have to cover the payload, not just the request",
    body: "Assumed an idempotency key alone was enough. It is not — if a client retries the same key with a changed body, you must reject it rather than silently serve the first result, or you will confidently return the wrong invoice.",
    impact: "Added a payload hash alongside the key and a 409 when they disagree.",
    tech: ["typescript", "api-design"], tags: ["billing", "correctness"], minutes: 75,
  },
  {
    daysAgo: 28, type: "work", project: "billing", company: "northwind",
    title: "Backfilled 12M invoice rows without downtime",
    body: "Batched the backfill at 5,000 rows per transaction with a short sleep between batches, driven by a cursor table so it could be stopped and resumed. Ran over three nights.",
    challenges: "First attempt held one transaction open for the whole batch set and bloated the WAL. Splitting into committed batches fixed it.",
    impact: "Zero downtime, zero locked tables, and a script the team has reused twice since.",
    tech: ["postgres", "typescript"], tags: ["data-migration", "database"], minutes: 400,
  },
];

/* ── run ─────────────────────────────────────────────────────────────────── */

const owner = await ensureDemoUser();

console.log("· clearing existing demo data");
await sql`DELETE FROM work_log WHERE owner_id = ${owner}`;
await sql`DELETE FROM project  WHERE owner_id = ${owner}`;
await sql`DELETE FROM company  WHERE owner_id = ${owner}`;

const companyIds = {};
for (const c of COMPANIES) {
  const [row] = await sql`
    INSERT INTO company (owner_id, name, notes)
    VALUES (${owner}, ${c.name}, ${c.notes})
    RETURNING id`;
  companyIds[c.key] = row.id;
}
console.log(`✓ ${COMPANIES.length} companies`);

const projectIds = {};
for (const p of PROJECTS) {
  const [row] = await sql`
    INSERT INTO project (owner_id, company_id, name, description, start_date, end_date)
    VALUES (${owner}, ${companyIds[p.company]}, ${p.name}, ${p.description}, ${p.start}, ${p.end})
    RETURNING id`;
  projectIds[p.key] = row.id;
}
console.log(`✓ ${PROJECTS.length} projects`);

for (const e of ENTRIES) {
  await sql`
    INSERT INTO work_log (
      owner_id, type, occurred_on, title, body, challenges, impact,
      company_id, project_id, tech_tags, tags, minutes_spent
    ) VALUES (
      ${owner}, ${e.type}, current_date - ${e.daysAgo}::int, ${e.title}, ${e.body},
      ${e.challenges ?? null}, ${e.impact ?? null},
      ${e.company ? companyIds[e.company] : null},
      ${e.project ? projectIds[e.project] : null},
      ${e.tech ?? []}, ${e.tags ?? []}, ${e.minutes ?? null}
    )`;
}
console.log(`✓ ${ENTRIES.length} journal entries`);

const byType = await sql`
  SELECT type, count(*)::int AS n FROM work_log WHERE owner_id = ${owner}
  GROUP BY type ORDER BY type`;
console.log("\nSeeded journal:");
for (const r of byType) console.log(`  ${r.type.padEnd(10)} ${r.n}`);
console.log(`\nDemo login → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
