/**
 * AUTH SEAM
 * =========
 *
 * Phase 0 ships no authentication. Every screen is open, and `getCurrentUser()`
 * returns a fixed placeholder. That is deliberate: it lets the whole shell be
 * designed and reviewed without a database or an identity provider in play.
 *
 * The important part is that the *shape* is already right. Nothing in the app
 * reads a user from anywhere else, so turning auth on is a change to this file
 * and nothing else.
 *
 * ── The plan: Neon Auth ──────────────────────────────────────────────────────
 * Neon Auth (Neon's built-in authentication, powered by Stack Auth) is the
 * chosen provider precisely because it keeps identity *inside* the same
 * Postgres as the domain data. Neon provisions and continuously syncs a
 * `neon_auth.users_sync` table, which means:
 *
 *   - No adapter tables to maintain (no `accounts` / `sessions` /
 *     `verification_tokens` of our own — Neon owns those).
 *   - `owner_id` foreign keys resolve inside the database, so a join from a
 *     work log to its owner is an ordinary SQL join, not an API call.
 *   - One vendor, one connection string, one dashboard.
 *
 * Wiring it up, when we get there:
 *   1. Enable Auth in the Neon console; it hands back the three NEXT_PUBLIC_
 *      Stack keys and a secret key (see .env.example).
 *   2. `pnpm add @stackframe/stack` and mount its handler route.
 *   3. Replace the body of `getCurrentUser()` below with the real session read.
 *   4. Turn `requireUser()` back into an actual redirect.
 *   5. Point `users` in the schema at `neon_auth.users_sync` (see lib/db/schema.ts).
 *
 * TODO(Phase 1): do the five steps above.
 */

export interface CurrentUser {
  /** Matches `neon_auth.users_sync.id` once Neon Auth is live. */
  id: string;
  name: string;
  email: string;
  /** Derived, not stored — used by the avatar. */
  initials: string;
  /**
   * Phase 0 has no roles. Kept on the type so the Admin screen can start
   * gating on it the moment there is more than one user.
   * TODO(Phase 6): move to a real role column / organization membership.
   */
  role: "owner" | "member";
}

/** The stand-in identity every screen renders against until auth is real. */
const PLACEHOLDER_USER: CurrentUser = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Swarnil Singhai",
  email: "swarnilsinghaicse@gmail.com",
  initials: "SS",
  role: "owner",
};

/**
 * The only sanctioned way to learn who is asking.
 *
 * Async from day one even though the placeholder is synchronous — every call
 * site is already written to await it, so swapping in the real session read
 * does not ripple outwards.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  // TODO(Phase 1): replace with the Neon Auth session read, e.g.
  //   const user = await stackServerApp.getUser();
  //   if (!user) return null;
  return PLACEHOLDER_USER;
}

/**
 * Use this in any layout or page that must not render for a signed-out
 * visitor. It is a no-op today so the whole app stays browsable without
 * credentials — but the call sites are already in place.
 */
export async function requireUser(): Promise<CurrentUser> {
  // TODO(Phase 1): if (!user) redirect("/login");
  return getCurrentUser();
}
