/**
 * UI PREFERENCES — theme and sidebar state
 * ========================================
 *
 * Stored in cookies rather than localStorage, and that is the whole design.
 *
 * The problem these solve is the flash: if the server does not know your
 * theme, it renders light, and a dark-mode user gets a white flare on every
 * fresh document. The usual fix is an inline <script> in <head> that reads
 * localStorage before first paint — but React 19 refuses to render a script
 * tag inside a component tree, and `next/script` with `beforeInteractive`
 * hits the same wall in the App Router.
 *
 * A cookie is sent with the request, so the server can simply *know*. The
 * attribute is in the HTML from the start, there is nothing to correct after
 * hydration, and no script is involved at all.
 *
 * The trade is that reading cookies in the root layout opts the tree into
 * dynamic rendering. That costs JobOS nothing — every authenticated route is
 * already per-request, and the homepage reads the session anyway.
 */

export const THEME_COOKIE = "jobos-theme";
export const RAIL_COOKIE = "jobos-rail";

/** A year: this is a preference, not a session. */
const MAX_AGE = 60 * 60 * 24 * 365;

export type ThemeChoice = "light" | "dark" | "system";
export type RailState = "expanded" | "collapsed";

export function isTheme(value: string | undefined): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Writes a preference cookie from the browser.
 *
 * `SameSite=Lax` because these travel with ordinary navigation and nothing
 * else; no `Secure` flag so it still works over plain http on localhost.
 */
export function writePreference(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

export function readPreference(name: string): string | undefined {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}
