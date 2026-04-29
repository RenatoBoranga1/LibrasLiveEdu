import { Radio } from "lucide-react";

export function ModeBadge({ label = "modo demonstração" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/15 px-3 py-1 text-sm font-semibold text-ink dark:text-white">
      <Radio className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}
