"use client";

import { Contrast, Maximize2 } from "lucide-react";

export function AccessibleModeToggle({
  highContrast,
  largeText,
  onHighContrast,
  onLargeText,
}: {
  highContrast: boolean;
  largeText: boolean;
  onHighContrast: () => void;
  onLargeText: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Modos de acessibilidade">
      <button
        type="button"
        className={`focus-ring min-h-12 rounded-lg px-3 py-2 text-sm font-bold ${largeText ? "bg-ocean text-white" : "bg-white text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint"}`}
        onClick={onLargeText}
        aria-pressed={largeText}
      >
        <Maximize2 className="mx-auto h-5 w-5" aria-hidden="true" />
        Fonte grande
      </button>
      <button
        type="button"
        className={`focus-ring min-h-12 rounded-lg px-3 py-2 text-sm font-bold ${highContrast ? "bg-ink text-white" : "bg-white text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint"}`}
        onClick={onHighContrast}
        aria-pressed={highContrast}
      >
        <Contrast className="mx-auto h-5 w-5" aria-hidden="true" />
        Alto contraste
      </button>
    </div>
  );
}
