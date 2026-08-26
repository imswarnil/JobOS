"use client";

import {
  THEME_COOKIE,
  isTheme,
  readPreference,
  writePreference,
  type ThemeChoice,
} from "@/lib/preferences";

export type { ThemeChoice };

/**
 * THEME STORE
 * ===========
 *
 * The theme genuinely lives outside React — it is an attribute on <html> and
 * a cookie the server reads. Reading it into state in an effect would mean
 * rendering the wrong value first and correcting it, which is both a
 * cascading render and a visible flicker on the toggle.
 * `useSyncExternalStore` reads the real value on the first client render.
 *
 * The cookie is what removes the flash: see lib/preferences.ts.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changing the theme should update this one too.
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", emit);
  };
}

export function getSnapshot(): ThemeChoice {
  const stored = readPreference(THEME_COOKIE);
  return isTheme(stored) ? stored : "system";
}

/**
 * The server renders whatever the cookie said, and the cookie is the source of
 * truth on the client too — so this matches and there is no mismatch to
 * reconcile. "system" is the honest default for a first-time visitor.
 */
export function getServerSnapshot(): ThemeChoice {
  return "system";
}

/**
 * Persist the choice and reflect it on <html>.
 *
 * "system" *removes* the attribute rather than resolving it, so the
 * `prefers-color-scheme` rules in globals.css take over — the same state the
 * server renders for a visitor who has never chosen. Resolving it to a
 * literal here would mean the toggle and a fresh page load disagree the next
 * time the OS theme changes.
 */
export function setTheme(choice: ThemeChoice) {
  const root = document.documentElement;

  writePreference(THEME_COOKIE, choice);

  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);

  emit();
}
