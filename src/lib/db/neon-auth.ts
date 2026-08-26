import { boolean, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * NEON-MANAGED IDENTITY
 * =====================
 *
 * Neon Auth is Better Auth, hosted by Neon, writing into a `neon_auth` schema
 * **inside our own database**. That is better than it sounds: sessions,
 * accounts and users are real rows we can join against, not records behind
 * someone else's API. `owner_id` is a genuine foreign key.
 *
 * Neon provisions and migrates these tables. We declare only the ones we read
 * from, so joins are typed — we never create, alter or drop them.
 *
 * This module is deliberately **not** re-exported from `schema.ts`:
 * drizzle-kit generates DDL for every table reachable from the configured
 * entrypoint, and a migration containing `CREATE SCHEMA "neon_auth"` would
 * collide with Neon's own provisioning. Keeping it unreachable makes that
 * impossible rather than merely discouraged. (`schemaFilter` in
 * drizzle.config.ts does not cover this — it filters introspection and push,
 * not generate.)
 *
 * Column names are camelCase in the database because Better Auth created them
 * that way. Quoted identifiers, so they must be spelled exactly.
 */
export const neonAuth = pgSchema("neon_auth");

export const authUser = neonAuth.table("user", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  /** Better Auth's admin plugin. Null for ordinary users. */
  role: text("role"),
  banned: boolean("banned"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
});

/**
 * Sessions are server-side rows, not just signed cookies — which means
 * "sign out everywhere" is a DELETE, and the Admin screen can show real
 * active sessions rather than a guess.
 */
export const authSession = neonAuth.table("session", {
  id: uuid("id").primaryKey(),
  userId: uuid("userId").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
});

export type AuthUser = typeof authUser.$inferSelect;
export type AuthSession = typeof authSession.$inferSelect;
