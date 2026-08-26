import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

/**
 * WHO IS ASKING
 * =============
 *
 * The single place the rest of the app learns about the current user. Every
 * screen and every server action goes through here, so there is exactly one
 * definition of "signed in" to reason about.
 *
 * Backed by Neon Auth (Better Auth, hosted by Neon). See lib/auth/server.ts.
 */

export interface CurrentUser {
  /** `neon_auth.user.id` — the same uuid our `owner_id` columns point at. */
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** Derived, not stored — used by the avatar. */
  initials: string;
  /**
   * Better Auth's admin plugin writes this. Null for ordinary accounts; the
   * Admin screen gates on it.
   */
  role: string | null;
}

/** "Swarnil Singhai" → "SS"; "demo@jobos.app" → "DE". */
function initialsOf(name: string, email: string): string {
  const source = name?.trim() || email;
  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Returns the signed-in user, or null.
 *
 * Any server component calling this must opt out of static rendering — it
 * reads cookies, so a prerendered page would bake in one visitor's session.
 * Use `export const dynamic = "force-dynamic"`.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    initials: initialsOf(user.name, user.email),
    role: (user as { role?: string | null }).role ?? null,
  };
}

/**
 * The guard for anything behind the sign-in wall. Redirects rather than
 * throwing, so a signed-out visitor lands somewhere useful.
 *
 * Route protection lives here rather than in middleware on purpose: the
 * public homepage, the auth screens and the app shell have genuinely
 * different rules, and a layout-level call states that plainly instead of
 * encoding it in a matcher regex.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
