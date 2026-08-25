import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next, so it does not get .env.local for free.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Only read when you actually run push/migrate/studio — `generate` works
    // offline from the schema file alone.
    url: process.env.DATABASE_URL ?? "",
  },
  /**
   * Migrations cover `public` only. The `neon_auth` schema — and the
   * `users_sync` table inside it — is provisioned and maintained by Neon Auth;
   * generating DDL for it would fight the platform. We declare it in
   * schema.ts purely so foreign keys and joins are typed.
   */
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
