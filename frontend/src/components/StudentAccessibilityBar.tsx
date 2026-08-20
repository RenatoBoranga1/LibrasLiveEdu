"use client";

import Link from "next/link";
import { BookmarkPlus, Contrast, Focus, History, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";

export function StudentAccessibilityBar({
  highContrast,
  focusMode,
  avatarPaused,
  canSaveWord,
  reviewHref,
  onDecreaseText,
  onIncreaseText,
  onToggleContrast,
  onToggleFocus,
  onToggleAvatar,
  onRepeatSignal,
  onSaveWord,
}: {
  highContrast: boolean;
  focusMode: boolean;
  avatarPaused: boolean;
  canSaveWord: boolean;
  reviewHref: string;
  onDecreaseText: () => void;
  onIncreaseText: () => void;
  onToggleContrast: () => void;
  onToggleFocus: () => void;
  onToggleAvatar: () => void;
  onRepeatSignal: () => void;
  onSaveWord: () => void;
}) {
  const baseClass = "focus-ring flex min-h-16 min-w-24 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-black lg:min-h-14";
  const inactiveClass = "bg-white text-ocean dark:bg-zinc-900 dark:text-mint";
  const activeClass = "bg-ocean text-white";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-paper/95 px-3 py-2 shadow-elevated backdrop-blur dark:border-white/10 dark:bg-zinc-950/95" aria-label="Acessibilidade e ações da aula">
      <div className="mx-auto max-w-6xl overflow-x-auto pb-1">
        <div className="grid grid-flow-col auto-cols-[minmax(96px,1fr)] gap-2 lg:grid-flow-row lg:grid-cols-8">
          <button type="button" className={`${baseClass} ${inactiveClass}`} onClick={onDecreaseText} aria-label="Reduzir fonte da legenda">
            <Minus className="h-5 w-5" aria-hidden="true" />
            Reduzir fonte
          </button>
          <button type="button" className={`${baseClass} ${inactiveClass}`} onClick={onIncreaseText} aria-label="Aumentar fonte da legenda">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Aumentar fonte
          </button>
          <button type="button" className={`${baseClass} ${highContrast ? activeClass : inactiveClass}`} onClick={onToggleContrast} aria-pressed={highContrast} aria-label="Alternar alto contraste">
            <Contrast className="h-5 w-5" aria-hidden="true" />
            Alto contraste
          </button>
          <button type="button" className={`${baseClass} ${focusMode ? activeClass : inactiveClass}`} onClick={onToggleFocus} aria-pressed={focusMode} aria-label="Alternar modo foco">
            <Focus className="h-5 w-5" aria-hidden="true" />
            Modo foco
          </button>
          <button type="button" className={`${baseClass} ${avatarPaused ? activeClass : inactiveClass}`} onClick={onToggleAvatar} aria-pressed={avatarPaused} aria-label={avatarPaused ? "Retomar animação do Avatar" : "Pausar animação do Avatar"}>
            {avatarPaused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
            {avatarPaused ? "Retomar sinal" : "Pausar sinal"}
          </button>
          <button type="button" className={`${baseClass} ${inactiveClass}`} onClick={onRepeatSignal} aria-label="Repetir último sinal">
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Repetir sinal
          </button>
          <button type="button" className={`${baseClass} ${inactiveClass} disabled:cursor-not-allowed disabled:opacity-45`} onClick={onSaveWord} disabled={!canSaveWord} aria-label="Salvar palavra ou sinal atual">
            <BookmarkPlus className="h-5 w-5" aria-hidden="true" />
            Salvar palavra
          </button>
          <Link className={`${baseClass} ${inactiveClass}`} href={reviewHref} aria-label="Revisar aula depois">
            <History className="h-5 w-5" aria-hidden="true" />
            Revisar depois
          </Link>
        </div>
      </div>
    </nav>
  );
}
