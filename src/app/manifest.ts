import type { MetadataRoute } from "next";

/**
 * The install manifest.
 *
 * A route rather than a static file so the theme colours stay tied to the
 * design tokens in one place rather than being copied into JSON that nobody
 * remembers to update.
 *
 * `start_url` is /dashboard, not /: someone who installed this to their home
 * screen has already read the pitch. They want the app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobOS — career operating system",
    short_name: "JobOS",
    description:
      "Log the work while you remember it. Turn the record into a resume, tailor it to the role, and track every application.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // --ink-1000 and --signal-500: the same values as globals.css.
    background_color: "#08080c",
    theme_color: "#f04e2e",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // The two things worth doing straight from a long-press on the icon.
    shortcuts: [
      {
        name: "Log today's work",
        short_name: "Log",
        url: "/journal?compose=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Open the journal",
        short_name: "Journal",
        url: "/journal",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
