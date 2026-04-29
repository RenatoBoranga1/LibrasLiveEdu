"use client";

export type LiveViewMode = "full" | "focus" | "caption" | "cards";

const modes: Array<{ value: LiveViewMode; label: string }> = [
  { value: "full", label: "Completo" },
  { value: "focus", label: "Foco" },
  { value: "caption", label: "Legenda" },
  { value: "cards", label: "Cards" },
];

export function LiveModeSelector({ value, onChange }: { value: LiveViewMode; onChange: (value: LiveViewMode) => void }) {
  return (
    <div className="grid grid-cols-4 rounded-lg bg-white p-1 shadow-soft dark:bg-zinc-900" aria-label="Modo de visualizacao">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          className={`focus-ring min-h-10 rounded-md px-2 text-xs font-black ${value === mode.value ? "bg-ocean text-white" : "text-ink/70 dark:text-white/70"}`}
          onClick={() => onChange(mode.value)}
          aria-pressed={value === mode.value}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
