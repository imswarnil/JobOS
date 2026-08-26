import { auth } from "@/lib/auth/server";

/**
 * Proxies the browser's auth calls through to the Neon-hosted auth server,
 * attaching and reading the signed session cookie on this origin. Without it,
 * cookies would be cross-site and the session would not stick.
 */
export const { GET, POST } = auth.handler();
