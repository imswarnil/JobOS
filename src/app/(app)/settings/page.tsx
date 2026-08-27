import type { Metadata } from "next";
import { Suspense } from "react";
import { Braces, Cpu, Download, Palette, Trash2, User } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ProfileForm } from "@/components/settings/profile-form";
import {
  ModelChain,
  ModelChainSkeleton,
} from "@/components/settings/model-chain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/**
 * Settings is a "now" screen rather than a phase placeholder — the appearance
 * control is genuinely functional today. Everything that needs a database is
 * rendered but disabled, with a note saying so, which is more honest than
 * hiding it.
 */
export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Your profile, how JobOS looks, and the services it talks to."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>
            Used on your resume and as the sender identity on applications.
          </CardDescription>
        </CardHeader>
        <ProfileForm user={user} />
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Follows your system by default. The choice is remembered on this
            device.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-fg">Colour theme</p>
            <p className="text-xs text-fg-subtle">Light, dark, or system.</p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />
            <CardTitle>The model chain</CardTitle>
          </div>
          <CardDescription>
            Tried top to bottom until one answers. Local first on purpose —
            what goes through here is your whole work history and every role
            you are considering, and the hosted keys are the safety net rather
            than the default. Keys live in environment variables, never in the
            database; see
            <code className="mx-1 rounded-sm bg-sunken px-1 py-0.5 font-mono text-[0.75em]">
              .env.example
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Probing four hosts is the slowest thing on this page. Streaming
              it means the rest of settings paints immediately instead of
              waiting on a box that might be asleep. */}
          <Suspense fallback={<ModelChainSkeleton />}>
            <ModelChain />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />
            <CardTitle>Other services</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            {
              name: "Neon Postgres",
              detail: "Database and authentication",
              env: "DATABASE_URL",
              ready: Boolean(process.env.DATABASE_URL),
            },
            {
              name: "Crawl4AI",
              detail: "Runs a real browser for postings that render client-side",
              env: "CRAWL4AI_BASE_URL",
              ready: Boolean(process.env.CRAWL4AI_BASE_URL),
            },
            {
              name: "Adzuna",
              detail: "Job discovery API",
              env: "ADZUNA_APP_ID",
              ready: Boolean(process.env.ADZUNA_APP_ID),
            },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-3 rounded-control border border-line-subtle px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-fg">
                  {row.name}
                </p>
                <p className="truncate text-xs text-fg-subtle">
                  {row.ready ? row.detail : `${row.env} is not set.`}
                </p>
              </div>
              <Badge tone={row.ready ? "success" : "neutral"}>
                {row.ready ? "Connected" : "Off"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Your career record is yours. Export is a first-class feature, not a
            support request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* A plain authenticated GET — every table this account owns, as
                one JSON file. Scoped by session, so there is no parameter to
                tamper with. */}
            <a
              href="/api/export"
              className="inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 ease-out hover:border-line-strong hover:bg-sunken"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export everything
            </a>
            {/* TODO(Phase 2): destructive and irreversible — needs a typed
                confirmation before it is worth shipping. The cascade is
                already in place: deleting the auth user takes every owned row
                with it. */}
            <Button variant="danger" disabled>
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Delete account
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-fg-subtle">
            The export is every row you own — journal, companies, projects,
            resumes, jobs and applications — as JSON, with nothing held back.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
