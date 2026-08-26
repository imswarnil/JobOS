import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * The Neon Auth client — a singleton.
 *
 * Neon Auth is Better Auth hosted by Neon: the auth server lives at
 * `NEON_AUTH_BASE_URL` and writes users, sessions and accounts into the
 * `neon_auth` schema of *our own* database. Two consequences worth knowing:
 *
 *   - Sessions are rows, not just signed cookies. Revocation is real.
 *   - `owner_id` on our domain tables is a genuine foreign key to
 *     `neon_auth.user.id`, enforced by Postgres (drizzle/0001).
 *
 * This module is server-only. Importing it from a client component would leak
 * the cookie secret into the bundle — go through the server actions in
 * `src/lib/auth/actions.ts` instead.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in — ` +
        `see docs/DATABASE.md for where the values come from.`,
    );
  }
  return value;
}

export const auth = createNeonAuth({
  baseUrl: required("NEON_AUTH_BASE_URL"),
  cookies: {
    // Must be at least 32 characters; createNeonAuth throws otherwise.
    secret: required("NEON_AUTH_COOKIE_SECRET"),
    sessionDataTtl: 300,
  },
});
