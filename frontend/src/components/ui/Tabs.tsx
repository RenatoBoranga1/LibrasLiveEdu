"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; panel: ReactNode; disabled?: boolean };

export function Tabs({ items, value, onChange, label = "Seções" }: { items: TabItem[]; value: string; onChange: (id: string) => void; label?: string }) {
  const baseId = useId();
  const selected = items.find((item) => item.id === value) ?? items[0];
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentId: string) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.id === currentId);
    const next = event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) : enabled[(index + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
    if (!next) return;
    onChange(next.id);
    window.requestAnimationFrame(() => document.getElementById(`${baseId}-tab-${next.id}`)?.focus());
  }
  return <div>
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-ink/10 dark:border-white/10">
      {items.map((item) => <button key={item.id} id={`${baseId}-tab-${item.id}`} type="button" role="tab" aria-selected={item.id === selected?.id} aria-controls={`${baseId}-panel-${item.id}`} tabIndex={item.id === selected?.id ? 0 : -1} disabled={item.disabled} onClick={() => onChange(item.id)} onKeyDown={(event) => handleKeyDown(event, item.id)} className={cn("focus-ring touch-target shrink-0 border-b-2 px-4 py-3 text-sm font-extrabold", item.id === selected?.id ? "border-ocean text-ocean dark:border-mint dark:text-mint" : "border-transparent text-ink/60 dark:text-white/60")}>{item.label}</button>)}
    </div>
    {selected ? <div role="tabpanel" id={`${baseId}-panel-${selected.id}`} aria-labelledby={`${baseId}-tab-${selected.id}`} className="pt-5">{selected.panel}</div> : null}
  </div>;
}
