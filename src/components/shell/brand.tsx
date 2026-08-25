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
      className="group flex items-center gap-2.5 rounded-control px-1 py-1"
    >
      <SignalDot />
      <span className="flex flex-col leading-none">
        <span className="text-[0.9375rem] font-bold tracking-[-0.03em] text-fg">
          JobOS
        </span>
        <span className="mt-1 text-[0.625rem] font-medium tracking-[0.12em] text-fg-faint uppercase">
          Career OS
        </span>
      </span>
    </Link>
  );
}
