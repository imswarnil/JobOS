import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The record light, borrowed from Frame & Signal: a vermilion dot with a slow
 * halo. In JobOS it means the instance is live and logging.
 */
export function SignalDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid h-2.5 w-2.5 place-items-center", className)}>
      <span className="absolute inset-0 animate-ping rounded-pill bg-accent opacity-40 [animation-duration:2.4s]" />
      <span className="relative h-2 w-2 rounded-pill bg-accent" />
    </span>
  );
}

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="fx-tap group flex items-center gap-2.5 rounded-control px-1 py-1"
    >
      <SignalDot />
      <span className="flex flex-col leading-none">
        {/* The one gradient wordmark in the app. It is the logo; everything
            else stays flat so this reads as the mark rather than as a style. */}
        <span className="t-gradient text-[1rem] font-extrabold tracking-[-0.04em]">
          JobOS
        </span>
        <span className="mt-1 text-[0.625rem] font-semibold tracking-[0.14em] text-fg-faint uppercase">
          Career OS
        </span>
      </span>
    </Link>
  );
}
