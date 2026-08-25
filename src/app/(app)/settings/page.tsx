import type { Metadata } from "next";
import { Bot, Braces, Database, Download, Palette, Trash2, User } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Avatar } from "@/components/shell/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings is a "now" screen rather than a phase placeholder — the appearance
 * control is genuinely functional today. Everything that needs a database is
 * rendered but disabled, with a note saying so, which is more honest than
 * hiding it.
 */
export default async function SettingsPage() {
  const user = await getCurrentUser();

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
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar user={user} className="h-14 w-14 rounded-card text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">
                {user.name}
              </p>
              <p className="truncate text-xs text-fg-subtle">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="settings-name">
              <Input id="settings-name" defaultValue={user.name} disabled />
            </Field>
            <Field label="Email" htmlFor="settings-email">
              <Input id="settings-email" defaultValue={user.email} disabled />
            </Field>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <p className="text-xs text-fg-subtle">
            Editable once accounts are real.
          </p>
          <Button disabled>Save changes</Button>
        </CardFooter>
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
            <Braces className="h-4 w-4 text-fg-faint" strokeWidth={1.75} />
            <CardTitle>Integrations</CardTitle>
          </div>
          <CardDescription>
            Keys live in environment variables, never in the database. See
            <code className="mx-1 rounded-sm bg-sunken px-1 py-0.5 font-mono text-[0.75em]">
              .env.example
            </code>
            for the full list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            {
              name: "Neon Postgres",
              detail: "Database and authentication",
              icon: Database,
              phase: "Phase 1",
            },
            {
              name: "Google Gemini",
              detail: "Primary model for tailoring",
              icon: Bot,
              phase: "Phase 3",
            },
            {
              name: "Groq",
              detail: "Fallback model",
              icon: Bot,
              phase: "Phase 3",
            },
            {
              name: "Adzuna",
              detail: "Job discovery API",
              icon: Braces,
              phase: "Phase 4",
            },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-3 rounded-control border border-line-subtle px-3 py-2.5"
            >
              <row.icon
                className="h-4 w-4 shrink-0 text-fg-faint"
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-fg">
                  {row.name}
                </p>
                <p className="truncate text-xs text-fg-subtle">{row.detail}</p>
              </div>
              <Badge>{row.phase}</Badge>
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
        <CardContent className="flex flex-wrap gap-2">
          {/* TODO(Phase 1): export every owner-scoped table as JSON. */}
          <Button disabled>
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Export everything
          </Button>
          {/* TODO(Phase 1): destructive, needs a typed confirmation. */}
          <Button variant="danger" disabled>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
