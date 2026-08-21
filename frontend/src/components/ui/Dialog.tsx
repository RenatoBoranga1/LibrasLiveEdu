"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function Dialog({ open, title, description, onClose, children, footer, className }: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn("max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-elevated dark:bg-zinc-900", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-ink/10 p-5 dark:border-white/10">
        <div><h2 id={titleId} className="text-xl font-extrabold text-ink dark:text-white">{title}</h2>{description ? <p id={descriptionId} className="mt-1 text-sm font-medium text-ink/65 dark:text-white/65">{description}</p> : null}</div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label={`Fechar ${title}`}><X className="h-5 w-5" aria-hidden="true" /></Button>
      </header>
      <div className="p-5">{children}</div>
      {footer ? <footer className="border-t border-ink/10 p-5 dark:border-white/10">{footer}</footer> : null}
    </div>
  </div>;
}
