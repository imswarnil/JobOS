/**
 * SIDEBAR COLLAPSE STATE
 * ======================
 *
 * Lives outside React for the same reason the theme does: an inline script
 * stamps it on <html> before hydration, so a collapsed rail is already
 * collapsed on first paint instead of expanding and snapping shut.
 *
 * Read through `useSyncExternalStore` rather than an effect, so the first
 * client render sees the real value.
 */

const KEY = "jobos-rail";

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
  try {
    return localStorage.getItem(KEY) === "collapsed";
  } catch {
    return false;
  }
}

/** The server cannot know; expanded is the safe default and matches the SSR markup. */
export function getServerSnapshot(): boolean {
  return false;
}

export function setCollapsed(collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(KEY, "collapsed");
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode: the toggle still works for this session.
  }
  document.documentElement.dataset.rail = collapsed ? "collapsed" : "expanded";
  emit();
}

export function toggleCollapsed() {
  setCollapsed(!getSnapshot());
}
