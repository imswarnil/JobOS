import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";

/**
 * The protected area — except that in Phase 0 it protects nothing.
 * `requireUser()` is deliberately a no-op that returns the placeholder user,
 * so every screen is browsable without credentials while the shell is being
 * designed. The call site is already correct; only the helper changes.
 *
 * TODO(Phase 1): once Neon Auth is live, `requireUser()` redirects to /login
 * and this file needs no edit at all.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
