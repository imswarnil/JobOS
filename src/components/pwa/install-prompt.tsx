"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

import { readPreference, writePreference } from "@/lib/preferences";
import { cn } from "@/lib/utils";

const DISMISSED = "jobos-install-dismissed";

/**
 * Chrome fires `beforeinstallprompt` and lets you defer it; this catches that
 * event and offers the install at a moment the user chose, rather than
 * letting the browser interrupt them with its own bar.
 *
 * It only appears once someone is signed in and using the app — asking a
 * first-time visitor to install something they have not tried yet is how
 * install prompts earned their reputation. Dismissing it is remembered.
 *
 * Safari never fires the event, so it simply never renders there. That is the
 * correct behaviour: iOS installs via Share → Add to Home Screen, and a
 * button that cannot do anything is worse than no button.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [event, setEvent] = React.useState<InstallPromptEvent | null>(null);
  const [hidden, setHidden] = React.useState(true);

  React.useEffect(() => {
    if (readPreference(DISMISSED) === "1") return;

    function onPrompt(e: Event) {
      // Stop the browser's own bar; we present it ourselves.
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
      setHidden(false);
    }

    // Once installed, never ask again.
    function onInstalled() {
      writePreference(DISMISSED, "1");
      setHidden(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!event || hidden) return null;

  function dismiss() {
    writePreference(DISMISSED, "1");
    setHidden(true);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    // Either way the event is spent — it cannot be prompted twice.
    setEvent(null);
    setHidden(true);
  }

  return (
    <div
      className={cn(
        "fx-rise fixed right-4 bottom-4 z-40 max-w-xs",
        "rounded-card border border-line bg-raised p-4 shadow-e4",
      )}
      role="dialog"
      aria-label="Install JobOS"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-control text-fg-faint hover:bg-sunken hover:text-fg"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <p className="pr-6 text-sm font-semibold text-fg">Install JobOS</p>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">
        Add it to your home screen and it opens like an app — no browser bar,
        and one tap from logging what you did today.
      </p>

      <button
        type="button"
        onClick={install}
        className="fx-press mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-fg-on-accent transition-colors duration-200 ease-out hover:bg-accent-hover"
      >
        <Download className="h-4 w-4" strokeWidth={2.25} />
        Install
      </button>
    </div>
  );
}
