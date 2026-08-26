import type { Metadata } from "next";
import { CloudOff } from "lucide-react";

import { SignalDot } from "@/components/shell/brand";

export const metadata: Metadata = { title: "Offline" };

/**
 * The only page the service worker keeps.
 *
 * Static on purpose — it is precached, so it must not depend on a session or
 * a database. It exists so that opening the installed app on a train shows
 * something honest rather than the browser's dinosaur.
 */
export default function OfflinePage() {
  return (
    <div className="grid min-h-svh place-items-center px-6">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <div className="max-w-md space-y-4 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-control border border-line bg-surface text-fg-muted shadow-e1">
          <CloudOff className="h-5 w-5" strokeWidth={1.75} />
        </span>

        <h1 className="text-2xl font-bold tracking-[-0.03em] text-fg">
          No connection
        </h1>

        <p className="text-sm leading-relaxed text-fg-muted">
          JobOS keeps your journal on a server, so it needs a network to show
          it to you. Everything you have written is safe — this page will work
          again the moment you are back online.
        </p>

        <div className="flex items-center justify-center gap-2 pt-2 text-xs text-fg-subtle">
          <SignalDot />
          Waiting for a connection
        </div>
      </div>
    </div>
  );
}
