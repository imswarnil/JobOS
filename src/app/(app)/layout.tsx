import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";

/**
 * The signed-in area. `requireUser()` redirects to /login when there is no
 * session, so nothing below this layout ever renders for a stranger.
 *
 * Dynamic because the session is read from cookies — prerendering this would
 * bake one visitor's account into the static output.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
