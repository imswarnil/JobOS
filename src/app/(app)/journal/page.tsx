import type { Metadata } from "next";
import { NotebookPen } from "lucide-react";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <PhasePlaceholder
      phase="P1"
      icon={NotebookPen}
      title="Work journal"
      description="Log what you did today — the company, the project, the tasks, what fought back, and what actually changed because of it. Everything else in JobOS is generated from this record."
    />
  );
}
