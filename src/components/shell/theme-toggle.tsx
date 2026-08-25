"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  getServerSnapshot,
  getSnapshot,
  setTheme,
  subscribe,
  type ThemeChoice,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const choice = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface p-0.5",
        className,
      )}
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={choice === value}
          onClick={() => setTheme(value)}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-pill transition-colors duration-200 ease-out",
            choice === value
              ? "bg-inverse text-fg-on-inverse"
              : "text-fg-subtle hover:text-fg",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
