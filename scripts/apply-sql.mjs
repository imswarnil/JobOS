/**
 * Applies a hand-written .sql file that drizzle-kit cannot generate.
 *
 * These live in drizzle/manual/ rather than alongside the generated ones,
 * because drizzle-kit numbers its own migrations and will happily emit an
 * `0001` next to a hand-written `0001`.
 *
 *   node scripts/apply-sql.mjs drizzle/manual/001_owner_foreign_keys.sql
 *   node scripts/apply-sql.mjs drizzle/manual/*.sql
 *
 * Idempotent: statements that are already applied are skipped, so running the
 * whole directory after every `db:migrate` is safe.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: node scripts/apply-sql.mjs <file.sql> [more.sql…]");
  process.exit(1);
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set");

const sql = neon(url);

for (const file of files) {
  console.log(`\n${file}`);
  const statements = readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);

  for (const statement of statements) {
    const label = statement.replace(/\s+/g, " ").slice(0, 68);
    try {
      await sql.query(statement);
      console.log(`  ok   ${label}`);
    } catch (error) {
      // Re-running a file must be harmless.
      if (error.code === "42710" || /already exists|duplicate/i.test(error.message)) {
        console.log(`  skip ${label} (already present)`);
      } else {
        console.error(`  FAIL ${label}\n       ${error.message}`);
        process.exitCode = 1;
      }
    }
  }
}
