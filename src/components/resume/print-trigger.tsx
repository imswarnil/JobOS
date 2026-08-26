"use client";

import * as React from "react";
import { ArrowLeft, Printer } from "lucide-react";

/**
 * Opens the print dialog, and offers a way back.
 *
 * The bar is `.no-print`, so it exists on screen and vanishes in the output.
 *
 * Printing is deferred to the load event rather than fired on mount: Chrome
 * will happily open the dialog before webfonts have settled, and the PDF then
 * measures in a fallback face — the line breaks in the file differ from the
 * ones on screen, which is exactly the drift this route exists to avoid.
 */
export function PrintTrigger({
  auto,
  filename,
}: {
  auto: boolean;
  /** Only used for the on-screen hint; the browser reads document.title. */
  filename: string;
}) {
  React.useEffect(() => {
    if (!auto) return;

    let cancelled = false;

    async function print() {
      // Wait for fonts, so the PDF measures with the real typeface.
      try {
        await document.fonts.ready;
      } catch {
        // Not fatal — an older browser just prints a moment earlier.
      }
      // One frame, so the last layout pass has definitely landed.
      requestAnimationFrame(() => {
        if (!cancelled) window.print();
      });
    }

    if (document.readyState === "complete") void print();
    else window.addEventListener("load", () => void print(), { once: true });

    return () => {
      cancelled = true;
    };
  }, [auto]);

  return (
    <div className="no-print sticky top-0 z-10 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[52rem] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{filename}</p>
          <p className="text-xs text-fg-subtle">
            Choose <strong className="font-semibold">Save as PDF</strong> as the
            destination.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => window.close()}
            className="fx-press hidden h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-medium text-fg-muted transition-colors duration-200 ease-out hover:border-line-strong hover:text-fg sm:flex"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="fx-press flex h-9 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-fg-on-accent shadow-e1 transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" strokeWidth={2.25} />
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
