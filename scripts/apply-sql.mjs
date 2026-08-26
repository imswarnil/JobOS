/**
 * Applies a hand-written .sql file that drizzle-kit cannot generate — currently
 * only the ownership foreign keys, which target a Neon-managed table.
 *
 * Usage: node scripts/apply-sql.mjs drizzle/0001_owner_foreign_keys.sql
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-sql.mjs <file.sql>");
  process.exit(1);
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set");

const sql = neon(url);
const statements = readFileSync(file, "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

for (const statement of statements) {
  const label = statement.replace(/\s+/g, " ").slice(0, 72);
  try {
    await sql.query(statement);
    console.log(`  ok   ${label}`);
  } catch (error) {
    // Re-running the file should be harmless.
    if (error.code === "42710" || /already exists/i.test(error.message)) {
      console.log(`  skip ${label} (already present)`);
    } else {
      console.error(`  FAIL ${label}\n       ${error.message}`);
      process.exitCode = 1;
    }
  }
}
