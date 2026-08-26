import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { PHASES } from "@/lib/phases";
import { LOG_TYPES } from "@/lib/journal/types";
import { PILLARS, STORY, TOOLS } from "@/lib/marketing";
import { Brand, SignalDot } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "JobOS — your career, finally written down",
  description:
    "A career operating system. Log the work while you remember it, turn the record into a resume, tailor it to the role using only real facts, and track every application.",
};

/** Reads the session to swap the header CTA, so it cannot be prerendered. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user);

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Brand href="/" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            {signedIn ? (
              <Link href="/dashboard" className={cta}>
                Open the app
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-10 items-center rounded-control px-3 text-sm font-semibold text-fg-muted hover:text-fg sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link href="/login" className={cta}>
                  Try the demo
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="flex items-center gap-2.5">
            <SignalDot />
            <span className="t-slate">Career operating system</span>
          </div>

          <h1 className="mt-6 max-w-[15ch] text-[2.75rem] leading-[1.02] font-bold tracking-[-0.04em] text-fg sm:text-6xl lg:text-7xl">
            Your career, finally{" "}
            <span className="text-fg-accent">written down.</span>
          </h1>

          <p className="mt-7 max-w-[52ch] text-lg leading-relaxed text-fg-muted">
            You do two good years of work and remember three things about it.
            JobOS keeps the record as it happens — then turns it into a resume,
            tailors it to the role, and tracks where every application went.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/login" className={`${cta} h-12 px-6 text-base`}>
              Explore the demo account
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-control border border-line bg-surface px-6 text-base font-semibold text-fg transition-colors duration-200 ease-out hover:border-line-strong hover:bg-sunken"
            >
              Create an account
            </Link>
          </div>

          <p className="mt-4 text-xs text-fg-subtle">
            The demo is a real account with a journal already in it — no sign-up,
            nothing to delete afterwards.
          </p>
        </div>
      </section>

      {/* ── The problem ──────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-sunken">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <span className="t-slate">Why this exists</span>
          <h2 className="mt-4 max-w-[20ch] text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">
            I built this because I kept losing my own work.
          </h2>

          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {STORY.map((item, i) => (
              <div key={item.heading} className="flex gap-5">
                <span className="t-num shrink-0 text-2xl font-bold text-fg-faint tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-fg">
                    {item.heading}
                  </h3>
                  <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-fg-muted">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Log types ────────────────────────────────────────────────────── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <span className="t-slate">What goes in</span>
          <h2 className="mt-4 max-w-[24ch] text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">
            Not just what you shipped.
          </h2>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-fg-muted">
            The entries that make you better are the ones people forget
            fastest — and half of them happen nowhere near an employer. So a
            company is optional on every kind of entry.
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOG_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  className="rounded-card border border-line bg-surface p-5 shadow-e1"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-control border border-line bg-sunken text-fg-muted">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <h3 className="text-sm font-semibold text-fg">{t.label}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                    {t.blurb}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-fg-faint italic">
                    &ldquo;{t.prompt}&rdquo;
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-sunken">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <span className="t-slate">How it works</span>
          <h2 className="mt-4 max-w-[22ch] text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">
            Four pillars, each feeding the next.
          </h2>

          <ol className="mt-12 space-y-px overflow-hidden rounded-card border border-line bg-line">
            {PILLARS.map((p) => (
              <li
                key={p.n}
                className="flex flex-col gap-3 bg-surface p-6 sm:flex-row sm:gap-8 sm:p-8"
              >
                <span className="t-num shrink-0 text-sm font-bold text-fg-accent sm:w-12">
                  {p.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-fg">{p.title}</h3>
                    <Badge>{p.phase}</Badge>
                  </div>
                  <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-fg-muted">
                    {p.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Tools ────────────────────────────────────────────────────────── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <span className="t-slate">What it is built with</span>
          <h2 className="mt-4 max-w-[24ch] text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">
            The stack, and why each piece is there.
          </h2>

          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.name}
                  className="flex gap-4 rounded-card border border-line bg-surface p-5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-line bg-sunken text-fg-muted">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-fg">
                      {tool.name}
                      <span className="ml-2 text-xs font-normal text-fg-faint">
                        {tool.role}
                      </span>
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                      {tool.why}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Roadmap ──────────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-sunken">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <span className="t-slate">Where the build is</span>
          <h2 className="mt-4 max-w-[22ch] text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">
            Built in phases, in the open.
          </h2>

          <ol className="mt-12 space-y-5 border-l border-line pl-7">
            {PHASES.map((phase) => {
              const done = phase.status === "shipped";
              const active = phase.status === "building";
              return (
                <li key={phase.id} className="relative">
                  <span
                    className={`absolute top-1.5 -left-[2.0625rem] grid h-4 w-4 place-items-center rounded-pill border-2 border-canvas ${
                      done
                        ? "bg-success-line"
                        : active
                          ? "bg-accent"
                          : "bg-line-strong"
                    }`}
                  >
                    {done ? (
                      <Check className="h-2.5 w-2.5 text-canvas" strokeWidth={4} />
                    ) : null}
                  </span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3
                      className={
                        done || active
                          ? "text-base font-semibold text-fg"
                          : "text-base font-medium text-fg-muted"
                      }
                    >
                      Phase {phase.id.slice(1)} · {phase.title}
                    </h3>
                    {done ? <Badge tone="success">Shipped</Badge> : null}
                    {active ? <Badge tone="accent">In progress</Badge> : null}
                  </div>
                  <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-fg-subtle">
                    {phase.summary}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-fg sm:text-4xl">
            Write down one true thing today.
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-base leading-relaxed text-fg-muted">
            In six months it is a resume. In two years it is the answer to
            every interview question you would otherwise have to invent on the
            spot.
          </p>
          <Link
            href="/login"
            className={`${cta} mt-8 h-12 px-6 text-base`}
          >
            Explore the demo account
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs text-fg-subtle">
            JobOS — built by{" "}
            <a
              href="https://imswarnil.com"
              className="font-semibold text-fg-muted hover:text-fg-accent"
            >
              Swarnil Singhai
            </a>
          </p>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="https://github.com/imswarnil"
              className="flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg"
            >
              <GitHubMark />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const cta =
  "inline-flex h-10 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-fg-on-accent shadow-e1 transition-colors duration-200 ease-out hover:bg-accent-hover active:bg-accent-press";

/** Lucide dropped brand marks in v1, so this one is inline. */
function GitHubMark() {
  return (
    <svg
      className="h-3.5 w-3.5 fill-current"
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
