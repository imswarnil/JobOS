import { jsonb, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

/**
 * NEON-MANAGED IDENTITY
 * =====================
 *
 * Neon Auth provisions this schema and table and keeps it in sync with the
 * identity provider. We declare it so query code can type a join from a
 * domain row to its owner — and for no other reason.
 *
 * It lives in its own module, deliberately *not* re-exported from schema.ts,
 * because drizzle-kit generates DDL for every table it can reach from the
 * configured schema entrypoint. Reachable would mean a migration containing
 * `CREATE SCHEMA "neon_auth"` and `CREATE TABLE "neon_auth"."users_sync"`,
 * which would collide with Neon's own provisioning the moment it ran.
 * Keeping it unreachable is what makes that impossible rather than merely
 * discouraged. (`schemaFilter` in drizzle.config.ts does not cover this —
 * it filters introspection and push, not generate.)
 *
 * Columns mirror Neon's managed shape exactly. Never add to them, never
 * migrate them.
 */
export const neonAuth = pgSchema("neon_auth");

export const usersSync = neonAuth.table("users_sync", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  rawJson: jsonb("raw_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  /** Soft delete — Neon keeps the row and stamps this. Filter on it. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type SyncedUser = typeof usersSync.$inferSelect;
