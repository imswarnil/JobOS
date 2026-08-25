import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { PhasePlaceholder } from "@/components/phase-placeholder";

export const metadata: Metadata = { title: "Resume" };

export default function ResumePage() {
  return (
    <PhasePlaceholder
      phase="P2"
      icon={FileText}
      title="Resume"
      description="One structured master resume you edit in the browser and export as an ATS-friendly PDF. Phase 3 adds JD-tailored versions, rewritten from real facts in your journal rather than invented ones."
    />
  );
}
