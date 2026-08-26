"use client";

import { RAIL_COOKIE, readPreference, writePreference } from "@/lib/preferences";

/**
 * SIDEBAR COLLAPSE STATE
 *
 * A cookie for the same reason the theme is one: the server stamps
 * `data-rail` on <html> from the request, so a collapsed rail is already
 * collapsed in the first painted frame rather than expanding and snapping
 * shut. See lib/preferences.ts.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", emit);
  };
}

export function getSnapshot(): boolean {
  return readPreference(RAIL_COOKIE) === "collapsed";
}

/** Matches the SSR markup, which the server drives from the same cookie. */
export function getServerSnapshot(): boolean {
  return false;
}

export function setCollapsed(collapsed: boolean) {
  writePreference(RAIL_COOKIE, collapsed ? "collapsed" : "expanded");
  document.documentElement.dataset.rail = collapsed ? "collapsed" : "expanded";
  emit();
}

export function toggleCollapsed() {
  setCollapsed(!getSnapshot());
}
