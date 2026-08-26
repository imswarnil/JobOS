import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * The Neon Auth client.
 *
 * Neon Auth is Better Auth hosted by Neon: the auth server lives at
 * `NEON_AUTH_BASE_URL` and writes users, sessions and accounts into the
 * `neon_auth` schema of *our own* database. Two consequences worth knowing:
 *
 *   - Sessions are rows, not just signed cookies. Revocation is real.
 *   - `owner_id` on our domain tables is a genuine foreign key to
 *     `neon_auth.user.id`, enforced by Postgres (drizzle/0001).
 *
 * ── Why this is lazy ────────────────────────────────────────────────────────
 * Constructing the client at module scope looks tidier and breaks the build.
 * `next build` imports every route module to collect page data, so a
 * top-level `createNeonAuth()` runs — and throws — on any machine where the
 * environment is not yet populated. That is exactly the situation on a fresh
 * Vercel project, and it fails as an opaque "Failed to collect page data".
 *
 * Building should never require credentials. Serving should. Deferring
 * construction to the first call draws that line in the right place: a
 * missing variable now surfaces on a request, with a message that says which
 * one, instead of aborting a deploy.
 *
 * This module is server-only. Importing it from a client component would leak
 * the cookie secret into the bundle — go through the server actions in
 * `src/lib/auth/actions.ts` instead.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Locally: copy .env.example to .env.local and fill ` +
        `it in. On a deployment: add it to the project's environment ` +
        `variables. See docs/DEPLOY.md.`,
    );
  }
  return value;
}

let instance: ReturnType<typeof createNeonAuth> | undefined;

/** The memoised client. Constructed on first use, never at import. */
export function getAuth() {
  if (!instance) {
    instance = createNeonAuth({
      baseUrl: required("NEON_AUTH_BASE_URL"),
      cookies: {
        // Must be at least 32 characters; createNeonAuth throws otherwise.
        secret: required("NEON_AUTH_COOKIE_SECRET"),
        sessionDataTtl: 300,
      },
    });
  }
  return instance;
}

/** True when this environment is configured enough to authenticate anyone. */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );
}
