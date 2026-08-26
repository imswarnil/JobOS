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
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

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
