import Link from "next/link";

import { Brand, SignalDot } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { PHASES } from "@/lib/phases";

/**
 * A two-column auth shell: the form on the left at a comfortable reading
 * width, and the pitch on the right on wide screens. The aside is decorative
 * and hidden below `lg`, so the form is never pushed below the fold on a
 * phone.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <div className="flex w-full flex-col lg:w-[52%]">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 sm:px-10">
          <Brand href="/" />
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>

        <footer className="flex h-16 shrink-0 items-center justify-between gap-4 px-6 text-xs text-fg-faint sm:px-10">
          <span>© {new Date().getFullYear()} Swarnil Singhai</span>
          <Link href="/dashboard" className="hover:text-fg-muted">
            Skip to the app →
          </Link>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-line bg-sunken lg:block lg:w-[48%]">
        <div className="bg-grid absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />

        <div className="relative flex h-full flex-col justify-center px-12 xl:px-16">
          <div className="flex items-center gap-2.5">
            <SignalDot />
            <span className="t-slate">Career operating system</span>
          </div>

          <h2 className="mt-6 max-w-[16ch] text-4xl font-bold tracking-[-0.035em] text-fg xl:text-5xl">
            Your career, finally{" "}
            <span className="text-fg-accent">written down.</span>
          </h2>

          <p className="mt-5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            Log the work while you still remember it. JobOS turns that record
            into a resume, tailors it to the role, and tracks where every
            application went.
          </p>

          <ol className="mt-10 space-y-4 border-l border-line pl-6">
            {/* The four product phases — Phase 0 is scaffolding and means
                nothing to a visitor. The first is lit because it is what
                lands next. */}
            {PHASES.slice(1, 5).map((phase, i) => (
              <li key={phase.id} className="relative">
                <span
                  className={
                    i === 0
                      ? "absolute top-2 -left-[1.8125rem] h-2 w-2 rounded-pill bg-accent"
                      : "absolute top-2 -left-[1.8125rem] h-2 w-2 rounded-pill bg-line-strong"
                  }
                />
                <p className="text-[0.8125rem] font-semibold text-fg">
                  {phase.title}
                </p>
                <p className="max-w-[44ch] text-xs leading-relaxed text-fg-subtle">
                  {phase.summary}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
