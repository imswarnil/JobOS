import {
  LayoutDashboard,
  NotebookPen,
  FileText,
  Briefcase,
  Send,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { PhaseId } from "@/lib/phases";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One line, shown as the tooltip on the collapsed rail and on the screen itself. */
  description: string;
  /** Which phase makes this screen real. Omitted once a screen is live. */
  phase?: PhaseId;
}

export interface NavGroup {
  /** The uppercase slate label above the group. */
  label: string;
  items: NavItem[];
}

/**
 * The sidebar, as data.
 *
 * The grouping is deliberately career-shaped rather than app-shaped: what you
 * did, what you send out, and where it went. A new screen means a new entry
 * here — the rail, the mobile drawer and the command bar all read this list.
 */
export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Where your search stands today.",
      },
    ],
  },
  {
    label: "Track record",
    items: [
      {
        label: "Journal",
        href: "/journal",
        icon: NotebookPen,
        description: "Log what you did today, while you still remember it.",
        phase: "P1",
      },
    ],
  },
  {
    label: "Materials",
    items: [
      {
        label: "Resume",
        href: "/resume",
        icon: FileText,
        description:
          "One master resume, many tailored versions — built from your journal.",
        phase: "P2",
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      {
        label: "Jobs",
        href: "/jobs",
        icon: Briefcase,
        description: "Roles worth your time, pulled from public job APIs.",
        phase: "P4",
      },
      {
        label: "Applications",
        href: "/applications",
        icon: Send,
        description: "Every application, and exactly where it stalled.",
        phase: "P4",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Profile, appearance, integrations and data.",
      },
      {
        label: "Admin",
        href: "/admin",
        icon: ShieldCheck,
        description: "Operational view of the instance.",
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((group) => group.items);

/** Longest-prefix match, so `/journal/2026-08-26` still lights up Journal. */
export function activeItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
