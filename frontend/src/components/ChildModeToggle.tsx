"use client";

export function ChildModeToggle({ value, onChange }: { value: "child" | "adult"; onChange: (value: "child" | "adult") => void }) {
  return (
    <div className="grid grid-cols-2 rounded-lg bg-white p-1 shadow-soft dark:bg-zinc-900" aria-label="Modo de linguagem">
      <button
        type="button"
        className={`focus-ring min-h-11 rounded-md px-3 text-sm font-black ${value === "child" ? "bg-amber text-ink" : "text-ink/70 dark:text-white/70"}`}
        onClick={() => onChange("child")}
        aria-pressed={value === "child"}
      >
        Modo crianca
      </button>
      <button
        type="button"
        className={`focus-ring min-h-11 rounded-md px-3 text-sm font-black ${value === "adult" ? "bg-ocean text-white" : "text-ink/70 dark:text-white/70"}`}
        onClick={() => onChange("adult")}
        aria-pressed={value === "adult"}
      >
        Modo adulto
      </button>
    </div>
  );
}
