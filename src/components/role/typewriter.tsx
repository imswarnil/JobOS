"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Types text out, one character at a time, with a blinking caret.
 *
 * Reduced-motion is not decoration here: a typing animation is exactly the
 * kind of thing that triggers vestibular discomfort, so someone who has asked
 * for less motion gets the finished string immediately rather than a faster
 * version of the same effect. That case is handled at render — there is no
 * animation to skip, because none is ever started.
 *
 * There is no `onDone`: sequencing is done with `startDelay`, so a stack of
 * these cascades with no coordination between them and no callback to keep
 * stable across renders.
 */
export function Typewriter({
  text,
  speed = 32,
  startDelay = 0,
  className,
  caret = true,
}: {
  text: string;
  /** Milliseconds per character. */
  speed?: number;
  startDelay?: number;
  className?: string;
  caret?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [typed, setTyped] = React.useState("");

  // Restart when the text changes. Adjusted during render rather than in an
  // effect, so a new string never paints the previous one for a frame first.
  const [typingFor, setTypingFor] = React.useState(text);
  if (typingFor !== text) {
    setTypingFor(text);
    setTyped("");
  }

  React.useEffect(() => {
    if (reduced) return;

    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;

    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setTyped(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay, reduced]);

  const shown = reduced ? text : typed;
  const done = shown.length >= text.length;

  return (
    <span
      className={cn(caret && !done && "fx-caret", className)}
      // The full string is always in the accessible tree — a screen reader
      // should not have to listen to it arrive one letter at a time.
      aria-label={text}
    >
      <span aria-hidden>{shown}</span>
    </span>
  );
}

/** Tracks the OS setting, and keeps tracking it if it changes mid-session. */
export function usePrefersReducedMotion(): boolean {
  const subscribe = React.useCallback((cb: () => void) => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
