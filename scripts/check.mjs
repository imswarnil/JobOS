/**
 * Health check for a JobOS environment.
 *
 * Answers "is this deployment actually wired up?" in one command — schema,
 * foreign keys, migrations, auth tables and data, all against whatever
 * DATABASE_URL points at.
 *
 *   pnpm db:check
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Every table that carries an owner_id — which is every domain table, by
 * design. Derived rather than counted, so adding a table makes this check
 * fail loudly until its foreign key is added too, instead of silently
 * comparing against a stale number.
 */
const OWNED_TABLES = [
  "application", "company", "job", "job_criteria", "llm_usage",
  "project", "resume_master", "resume_version", "work_log",
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const sql = neon(url);
let failures = 0;

function check(ok, label, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? "  " + detail : ""}`);
}

console.log(`Database: ${url.replace(/\/\/[^@]+@/, "//***@").split("?")[0]}\n`);

const tables = await sql`
  SELECT table_schema AS s, table_name AS t FROM information_schema.tables
  WHERE table_schema IN ('public', 'neon_auth')`;

const pub = tables.filter((r) => r.s === "public").map((r) => r.t);
const auth = tables.filter((r) => r.s === "neon_auth").map((r) => r.t);
const missing = OWNED_TABLES.filter((t) => !pub.includes(t));

check(missing.length === 0, `domain tables (${pub.length})`,
  missing.length ? `missing: ${missing.join(", ")}` : "");
check(auth.includes("user") && auth.includes("session"),
  `neon_auth tables (${auth.length})`,
  auth.length ? "" : "run: neonctl neon-auth enable");

const fkRows = await sql`
  SELECT table_name FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY' AND constraint_name LIKE '%\\_owner\\_fk'`;
const withFk = new Set(fkRows.map((r) => r.table_name));
const noFk = OWNED_TABLES.filter((t) => !withFk.has(t));
check(
  noFk.length === 0,
  `owner foreign keys (${OWNED_TABLES.length - noFk.length}/${OWNED_TABLES.length})`,
  noFk.length
    ? `missing on ${noFk.join(", ")} — run: node scripts/apply-sql.mjs drizzle/manual/*.sql`
    : "",
);

const [{ n: migrations }] = await sql`
  SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
check(migrations > 0, `migrations applied (${migrations})`);

const enums = await sql`
  SELECT t.typname AS name, count(e.enumlabel)::int AS n
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  GROUP BY t.typname ORDER BY t.typname`;
for (const e of enums) check(e.n > 0, `enum ${e.name} (${e.n} values)`);

const [counts] = await sql`
  SELECT (SELECT count(*)::int FROM neon_auth."user")   AS users,
         (SELECT count(*)::int FROM work_log)           AS logs,
         (SELECT count(*)::int FROM company)            AS companies,
         (SELECT count(*)::int FROM project)            AS projects`;
console.log(
  `\n  ${counts.users} account(s) · ${counts.logs} journal entries · ` +
  `${counts.companies} companies · ${counts.projects} projects`,
);

if (counts.logs) {
  const byType = await sql`
    SELECT type, count(*)::int AS n FROM work_log GROUP BY type ORDER BY type`;
  console.log("  " + byType.map((r) => `${r.type}=${r.n}`).join("  "));
}

const demo = process.env.DEMO_EMAIL;
if (demo) {
  const rows = await sql`
    SELECT id FROM neon_auth."user" WHERE email = ${demo} LIMIT 1`;
  check(rows.length > 0, `demo account (${demo})`,
    rows.length ? "" : "run: pnpm db:seed");
}

console.log();
for (const [name, label] of [
  ["NEON_AUTH_BASE_URL", "auth base url"],
  ["NEON_AUTH_COOKIE_SECRET", "cookie secret"],
]) {
  const v = process.env[name];
  const ok = name.endsWith("SECRET") ? Boolean(v) && v.length >= 32 : Boolean(v);
  check(ok, label, ok ? "" : `${name} missing or too short`);
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
