/**
 * JobOS service worker.
 *
 * Scope is deliberately narrow. JobOS is a per-user application whose every
 * page is server-rendered from a session, so caching HTML would mean serving
 * one person's dashboard to whoever opens the app next. That is not a
 * performance trade worth making.
 *
 * What it does:
 *   - Precaches the shell needed to show *something* offline: the offline
 *     page and the icons.
 *   - Serves static build assets cache-first — they are content-hashed, so a
 *     cached copy can never be stale.
 *   - Leaves every navigation and every API call to the network, and falls
 *     back to the offline page only when the network genuinely fails.
 *
 * What it deliberately does not do: cache authenticated HTML or JSON.
 */

const VERSION = "jobos-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

const PRECACHE = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      // A precache miss must not block activation — one 404 should not leave
      // the app permanently without a worker.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch auth or data endpoints.
  if (url.pathname.startsWith("/api/")) return;

  // Build output is content-hashed: cache-first is safe and always fresh.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navigations: network only, with the offline page as the fallback. Nothing
  // user-specific is ever written to a cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline").then(
          (hit) =>
            hit ??
            new Response("You are offline.", {
              status: 503,
              headers: { "content-type": "text/plain" },
            }),
        ),
      ),
    );
  }
});
