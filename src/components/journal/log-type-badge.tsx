import { logTypeMeta } from "@/lib/journal/types";
import type { LogType } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";

export function LogTypeBadge({ type }: { type: LogType }) {
  const meta = logTypeMeta(type);
  const Icon = meta.icon;

  return (
    <Badge tone={meta.tone}>
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {meta.label}
    </Badge>
  );
}
