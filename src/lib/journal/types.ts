import {
  BookOpen,
  BriefcaseBusiness,
  CloudLightning,
  Mountain,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { LogType } from "@/lib/db/schema";

/**
 * The vocabulary of the journal, in one place.
 *
 * A career record is not only "what I shipped". The entries that actually
 * make you better — a thing you learned, a wall you hit, a trick worth
 * keeping — are the ones people forget fastest, and plenty of them happen
 * nowhere near an employer. So the journal takes all six kinds, and a company
 * is optional on every one of them.
 *
 * `prompt` is the placeholder shown in the composer. It matters more than it
 * looks: the difference between an empty box and a filled journal is usually
 * a question specific enough to answer.
 */
export interface LogTypeMeta {
  id: LogType;
  label: string;
  icon: LucideIcon;
  /** Semantic tone — maps to the Badge tones and the timeline accent. */
  tone: "neutral" | "info" | "craft" | "special" | "danger" | "success";
  blurb: string;
  prompt: string;
}

export const LOG_TYPES: LogTypeMeta[] = [
  {
    id: "work",
    label: "Work",
    icon: BriefcaseBusiness,
    tone: "neutral",
    blurb: "Something you built or shipped.",
    prompt: "What did you actually build today, and for whom?",
  },
  {
    id: "learning",
    label: "Learning",
    icon: BookOpen,
    tone: "info",
    blurb: "Something you understand now that you did not before.",
    prompt: "What do you understand now that you did not this morning?",
  },
  {
    id: "challenge",
    label: "Challenge",
    icon: Mountain,
    tone: "craft",
    blurb: "A problem you are in the middle of.",
    prompt: "What are you stuck on, and what have you already ruled out?",
  },
  {
    id: "trick",
    label: "Trick",
    icon: Wrench,
    tone: "special",
    blurb: "A technique worth keeping.",
    prompt: "What shortcut or technique do you want to still know in a year?",
  },
  {
    id: "setback",
    label: "Setback",
    icon: CloudLightning,
    tone: "danger",
    blurb: "It went badly. Write it down before you rationalise it.",
    prompt: "What went wrong, and what would you watch for next time?",
  },
  {
    id: "win",
    label: "Win",
    icon: Trophy,
    tone: "success",
    blurb: "It went well. Resumes are made of these.",
    prompt: "What went well, and how would you prove it to someone?",
  },
];

export const LOG_TYPE_BY_ID = Object.fromEntries(
  LOG_TYPES.map((t) => [t.id, t]),
) as Record<LogType, LogTypeMeta>;

export function logTypeMeta(id: LogType): LogTypeMeta {
  return LOG_TYPE_BY_ID[id] ?? LOG_TYPE_BY_ID.work;
}
