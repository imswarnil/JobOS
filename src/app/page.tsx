import { redirect } from "next/navigation";

/**
 * There is no marketing page yet, and the app is the product. Land people on
 * the dashboard.
 *
 * TODO(Phase 6): when JobOS becomes multi-tenant this should serve a real
 * landing page and only redirect signed-in visitors.
 */
export default function Home() {
  redirect("/dashboard");
}
