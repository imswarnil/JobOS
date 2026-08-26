"use client";

import * as React from "react";

/**
 * Registers the service worker, once, after the page is interactive.
 *
 * Deliberately not registered during hydration: the worker's only jobs are
 * caching build assets and providing an offline fallback, neither of which
 * matters for the first paint — and competing with hydration for the main
 * thread to set that up would be a poor trade.
 *
 * Development is skipped entirely. A stale worker holding onto old chunks is
 * a genuinely confusing bug to chase, and there is nothing to gain from it
 * while the dev server is already serving everything fresh.
 */
export function RegisterServiceWorker() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    /**
     * In development, actively tear down any worker on this origin.
     *
     * Not merely "do not register" — that is not enough. A worker installed
     * by `pnpm preview` on port 3001 keeps running when `pnpm dev` later uses
     * the same port, and it serves /_next/static cache-first. That rule is
     * safe in production, where filenames are content-hashed, and actively
     * wrong in development, where Turbopack reuses names like
     * `[root-of-the-server]__15orhg7._.css` with different contents.
     *
     * The symptom is a genuinely confusing one: the server sends correct CSS,
     * the browser renders stale CSS, and a hard reload does not fix it. This
     * self-heals instead of leaving a trap on your own machine.
     */
    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));

        const names = await caches.keys();
        await Promise.all(
          names.filter((n) => n.startsWith("jobos-")).map((n) => caches.delete(n)),
        );

        if (registrations.length) {
          console.info(
            "[pwa] removed a service worker left over from a production build on this port; reload to get fresh assets",
          );
        }
      })();
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("[pwa] service worker registration failed", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
