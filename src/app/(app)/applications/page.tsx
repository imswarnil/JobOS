import type { Metadata } from "next";
import { Send } from "lucide-react";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <PhasePlaceholder
      phase="P4"
      icon={Send}
      title="Applications"
      description="Every role you applied to, which resume version went with it, and exactly where it stalled — found, tailored, applied, interview, offer."
    />
  );
}
