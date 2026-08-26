import type { Metadata } from "next";
import { AlertTriangle, Database, KeyRound, NotebookPen, ShieldCheck, Users } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { instanceStats, listUsers } from "@/lib/admin/queries";
import { PHASES } from "@/lib/phases";
import { formatDate } from "@/lib/utils";
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
export const dynamic = "force-dynamic";

/**
 * The operator's view of the instance.
 *
 * Every query on this page is instance-wide rather than owner-scoped, which
 * makes the route itself the security boundary. It is currently reachable by
 * any signed-in account — acceptable while this is a personal instance with a
 * demo login, and called out in the banner rather than hidden.
 *
 * TODO(Phase 6): gate on the role Better Auth already stores —
 *   if (user.role !== "admin") notFound();
 * The column exists (`neon_auth.user.role`) and `CurrentUser.role` reads it.
 */
export default async function AdminPage() {
  const [user, stats, users] = await Promise.all([
    requireUser(),
    instanceStats(),
    listUsers(),
  ]);

  const shipped = PHASES.filter((p) => p.status === "shipped").length;

  const services = [
    {
      name: "Neon Postgres",
      detail: "Domain data — 8 tables in `public`",
      status: "Connected",
      tone: "success" as const,
      icon: Database,
    },
    {
      name: "Neon Auth (Better Auth)",
      detail: "Users and sessions in `neon_auth`, same database",
      status: "Connected",
      tone: "success" as const,
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
        description="What this instance is running, who is on it, and how much of the build is done."
        eyebrow={<Badge tone="special">Instance</Badge>}
      />

      <div className="flex items-start gap-2.5 rounded-control border border-warning-line/40 bg-warning-bg px-3.5 py-3">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg"
          strokeWidth={2}
        />
        <p className="text-xs leading-relaxed text-warning-fg">
          Reachable by any signed-in account, including the demo login. Neon
          Auth already stores a role on every user, so the gate is a one-line
          change — it goes in when this instance stops being personal.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Accounts"
          value={stats.users}
          hint="Rows in neon_auth.user."
          icon={Users}
          tone="accent"
        />
        <StatTile
          label="Active sessions"
          value={stats.activeSessions}
          hint="Unexpired, server-side."
          icon={KeyRound}
        />
        <StatTile
          label="Journal entries"
          value={stats.workLogs}
          hint="Across every account."
          icon={NotebookPen}
          tone="craft"
        />
        <StatTile
          label="Phases shipped"
          value={`${shipped}/${PHASES.length}`}
          hint="Phase 1 is in progress."
          icon={ShieldCheck}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Every account on this instance, with how much each has logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-line-subtle text-left">
                <th className="t-slate pb-2 font-semibold">Name</th>
                <th className="t-slate pb-2 font-semibold">Email</th>
                <th className="t-slate pb-2 text-right font-semibold">Entries</th>
                <th className="t-slate pb-2 text-right font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 font-medium text-fg">
                    <span className="flex items-center gap-2">
                      {u.name}
                      {u.id === user.id ? <Badge>You</Badge> : null}
                      {u.role ? <Badge tone="special">{u.role}</Badge> : null}
                    </span>
                  </td>
                  <td className="py-2.5 text-fg-muted">{u.email}</td>
                  <td className="t-num py-2.5 text-right text-fg-muted">
                    {u.logCount}
                  </td>
                  <td className="t-num py-2.5 text-right text-fg-subtle">
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
              <s.icon className="h-4 w-4 shrink-0 text-fg-faint" strokeWidth={1.75} />
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
          <CardTitle>Your session</CardTitle>
          <CardDescription>
            What <code className="font-mono text-[0.75em]">getCurrentUser()</code>{" "}
            returned for this request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-line-subtle text-sm">
            {[
              ["User ID", user.id],
              ["Name", user.name],
              ["Email", user.email],
              ["Role", user.role ?? "— (no role set)"],
              ["Source", "Neon Auth · neon_auth.user"],
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
