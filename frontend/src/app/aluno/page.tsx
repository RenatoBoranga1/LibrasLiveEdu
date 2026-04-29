"use client";

import { useState } from "react";
import Link from "next/link";
import { Contrast, History, Maximize2, Play, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { AvatarPanel } from "@/components/AvatarPanel";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { KeywordCards } from "@/components/KeywordCards";
import { LiveCaption } from "@/components/LiveCaption";
import { ModeBadge } from "@/components/ModeBadge";
import { useLiveClass } from "@/hooks/useLiveClass";

export default function StudentPage() {
  const [codeInput, setCodeInput] = useState("AULA-4821");
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [enlargedText, setEnlargedText] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const live = useLiveClass(accessCode);

  function joinClass() {
    setAccessCode(codeInput.trim().toUpperCase());
  }

  function saveWord(word: string) {
    setSavedWords((current) => (current.includes(word) ? current : [word, ...current]));
  }

  return (
    <main className={`min-h-screen bg-paper dark:bg-zinc-950 ${highContrast ? "high-contrast" : ""}`}>
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {!accessCode ? (
          <section className="mx-auto grid max-w-3xl gap-4">
            <ModeBadge />
            <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h1 className="text-3xl font-black text-ink dark:text-white">Entrar na aula</h1>
              <label className="mt-6 block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="code">
                Código da aula
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  id="code"
                  className="focus-ring min-h-14 rounded-lg border border-ink/15 bg-white px-4 text-2xl font-black uppercase tracking-normal text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value)}
                />
                <ActionButton onClick={joinClass}>
                  <Play className="h-5 w-5" aria-hidden="true" />
                  Entrar
                </ActionButton>
              </div>
            </div>
            <InstitutionalNotice />
          </section>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ModeBadge label={live.connected ? "conectado em tempo real" : "modo demonstração"} />
                <span className="rounded-full bg-white px-3 py-2 text-sm font-black text-ink shadow-soft dark:bg-zinc-900 dark:text-white">
                  sala {accessCode}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="quiet" onClick={() => setEnlargedText((current) => !current)}>
                  <Maximize2 className="h-5 w-5" aria-hidden="true" />
                  Aumentar texto
                </ActionButton>
                <ActionButton tone="quiet" onClick={() => setHighContrast((current) => !current)}>
                  <Contrast className="h-5 w-5" aria-hidden="true" />
                  Alto contraste
                </ActionButton>
                <Link
                  href="/revisao"
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber px-4 py-3 font-bold text-ink"
                >
                  <History className="h-5 w-5" aria-hidden="true" />
                  Revisar aula
                </Link>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
              <AvatarPanel
                large
                status={live.translation.status}
                glossText={live.translation.glossText}
              />
              <div className="space-y-4">
                <LiveCaption text={live.currentCaption} enlarged={enlargedText} />
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="secondary" onClick={live.injectDemo}>
                    <RotateCcw className="h-5 w-5" aria-hidden="true" />
                    Simular próximo trecho
                  </ActionButton>
                </div>
              </div>
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-ink dark:text-white">Cards visuais</h2>
                {savedWords.length > 0 && (
                  <span className="rounded-full bg-ocean/10 px-3 py-1 text-sm font-bold text-ocean dark:bg-mint/10 dark:text-mint">
                    {savedWords.length} salvas
                  </span>
                )}
              </div>
              <KeywordCards cards={live.cards} onSave={saveWord} />
            </section>

            <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
              <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
                <h2 className="text-xl font-black text-ink dark:text-white">Histórico dos últimos trechos</h2>
                <div className="mt-4 space-y-2">
                  {live.segments.map((segment, index) => (
                    <p key={`${segment.id ?? index}-${segment.originalText}`} className="rounded-lg bg-teal-50 p-3 text-base font-semibold text-ink dark:bg-zinc-800 dark:text-white">
                      {segment.originalText ?? segment.text}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
                <h2 className="text-xl font-black text-ink dark:text-white">Palavras salvas</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(savedWords.length ? savedWords : ["Nenhuma palavra salva ainda"]).map((word) => (
                    <span key={word} className="rounded-full bg-amber/20 px-3 py-2 text-sm font-bold text-ink dark:text-white">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
