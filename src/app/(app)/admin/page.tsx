import type { Metadata } from "next";
import { AlertTriangle, Database, KeyRound, ShieldCheck, Users } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { PHASES } from "@/lib/phases";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin" };

/**
 * The operator's view of the instance.
 *
 * Deliberately ungated in Phase 0 — there is one user and no roles, so a
 * check would be theatre. `user.role` already exists on the type, so the gate
 * is a one-line addition the day a second account can exist.
 *
 * TODO(Phase 6): if (user.role !== "owner") notFound();
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  const shipped = PHASES.filter((p) => p.status === "shipped").length;

  const services = [
    {
      name: "Neon Postgres",
      detail: "Domain data and identity, one connection string",
      status: "Not connected",
      tone: "warning" as const,
      icon: Database,
    },
    {
      name: "Neon Auth",
      detail: "Users sync into neon_auth.users_sync",
      status: "Not connected",
      tone: "warning" as const,
      icon: KeyRound,
    },
    {
      name: "Model providers",
      detail: "Gemini primary, Groq fallback",
      status: "Stubbed",
      tone: "neutral" as const,
      icon: ShieldCheck,
    },
    {
      name: "Job sources",
      detail: "Greenhouse, Lever, Adzuna",
      status: "Stubbed",
      tone: "neutral" as const,
      icon: Users,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Admin"
        description="What this instance is running, what it is connected to, and how much of the build is done."
        eyebrow={<Badge tone="special">Owner only</Badge>}
      />

      <div className="flex items-start gap-2.5 rounded-control border border-warning-line/40 bg-warning-bg px-3.5 py-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg"
          strokeWidth={2}
        />
        <p className="text-xs leading-relaxed text-warning-fg">
          This screen is not access-controlled yet. JobOS has exactly one user
          in Phase 0, so there is nothing to protect it from — the role check
          goes in when accounts become real.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Accounts"
          value={1}
          hint="Single-user instance."
          icon={Users}
          tone="accent"
        />
        <StatTile
          label="Phases shipped"
          value={`${shipped}/${PHASES.length}`}
          hint="Phase 0 is in progress."
          icon={ShieldCheck}
        />
        <StatTile
          label="Domain rows"
          value={0}
          hint="No database connected."
          icon={Database}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            Every external dependency and whether it is actually wired up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {services.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-3 rounded-control border border-line-subtle px-3 py-3"
            >
              <s.icon
                className="h-4 w-4 shrink-0 text-fg-faint"
                strokeWidth={1.75}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium text-fg">
                  {s.name}
                </p>
                <p className="truncate text-xs text-fg-subtle">{s.detail}</p>
              </div>
              <Badge tone={s.tone}>{s.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            What <code className="font-mono text-[0.75em]">getCurrentUser()</code>{" "}
            currently returns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-line-subtle text-sm">
            {[
              ["User ID", user.id],
              ["Name", user.name],
              ["Email", user.email],
              ["Role", user.role],
              ["Source", "Placeholder — lib/auth/index.ts"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 py-2.5">
                <dt className="w-28 shrink-0 text-fg-subtle">{k}</dt>
                <dd className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] text-fg">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
