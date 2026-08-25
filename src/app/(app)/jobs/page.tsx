import type { Metadata } from "next";
import { Briefcase } from "lucide-react";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <PhasePlaceholder
      phase="P4"
      icon={Briefcase}
      title="Jobs"
      description="Matching roles pulled from legitimate public job APIs — Greenhouse, Lever and Adzuna — scored against your criteria and your actual track record. No scraping."
    />
  );
}
