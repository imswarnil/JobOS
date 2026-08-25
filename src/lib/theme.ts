/**
 * THEME STORE
 * ===========
 *
 * A three-line external store rather than a `useState` + `useEffect` pair.
 *
 * The theme genuinely lives outside React — it is an attribute on <html> that
 * an inline script sets before hydration, plus a `localStorage` key. Reading
 * it into state in an effect would mean rendering the wrong value first and
 * correcting it, which is both a cascading render and a visible flicker on the
 * toggle. `useSyncExternalStore` reads the real value on the first client
 * render instead.
 */

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "jobos-theme";

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
  try {
    return (localStorage.getItem(KEY) as ThemeChoice | null) ?? "system";
  } catch {
    return "system";
  }
}

/**
 * The server has no idea what the visitor prefers, and guessing would cause a
 * hydration mismatch. "system" is the honest answer — the inline script in the
 * root layout has already put the *resolved* theme on <html> by this point, so
 * only the toggle's own highlight is briefly indeterminate.
 */
export function getServerSnapshot(): ThemeChoice {
  return "system";
}

/** Stamp the resolved theme on <html> and persist the choice. */
export function setTheme(choice: ThemeChoice) {
  const root = document.documentElement;

  if (choice === "system") {
    localStorage.removeItem(KEY);
    root.setAttribute(
      "data-theme",
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
    );
  } else {
    localStorage.setItem(KEY, choice);
    root.setAttribute("data-theme", choice);
  }

  emit();
}
