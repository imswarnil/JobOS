import {
  Briefcase,
  GraduationCap,
  Handshake,
  User,
  type LucideIcon,
} from "lucide-react";

import type { OrgKind } from "@/lib/db/schema";

/**
 * The four things you can file an entry under.
 *
 * "Company" is the wrong word for three of them, which is why the UI says
 * "where the work happened" instead. A course you took on a Sunday is as
 * legitimate a source of career history as a job.
 */
export interface OrgKindMeta {
  id: OrgKind;
  label: string;
  plural: string;
  icon: LucideIcon;
  hint: string;
}

export const ORG_KINDS: OrgKindMeta[] = [
  {
    id: "employer",
    label: "Employer",
    plural: "Employers",
    icon: Briefcase,
    hint: "Somewhere you were on the payroll.",
  },
  {
    id: "client",
    label: "Client",
    plural: "Clients",
    icon: Handshake,
    hint: "Contract, freelance or agency work.",
  },
  {
    id: "education",
    label: "Course or school",
    plural: "Courses & schools",
    icon: GraduationCap,
    hint: "A degree, a bootcamp, a course you are working through.",
  },
  {
    id: "personal",
    label: "Personal",
    plural: "Personal",
    icon: User,
    hint: "Side projects and anything self-directed.",
  },
];

export const ORG_KIND_BY_ID = Object.fromEntries(
  ORG_KINDS.map((k) => [k.id, k]),
) as Record<OrgKind, OrgKindMeta>;

export function orgKindMeta(id: OrgKind): OrgKindMeta {
  return ORG_KIND_BY_ID[id] ?? ORG_KIND_BY_ID.employer;
}
