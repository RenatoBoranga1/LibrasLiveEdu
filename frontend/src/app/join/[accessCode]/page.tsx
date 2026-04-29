"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, CaptionsOff, Contrast, History, Maximize2, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { AvatarPanel } from "@/components/AvatarPanel";
import { LiveCaption } from "@/components/LiveCaption";
import { getClassByAccessCode, joinClass, saveWord } from "@/services/api";
import type { ClassSession, SignCard } from "@/types/live";
import { useLiveClass } from "@/hooks/useLiveClass";

export default function JoinClassPage() {
  const params = useParams<{ accessCode: string }>();
  const accessCode = decodeURIComponent(params.accessCode ?? "AULA-4821").toUpperCase();
  const live = useLiveClass(accessCode);
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [enlargedText, setEnlargedText] = useState(true);
  const [captionPaused, setCaptionPaused] = useState(false);
  const [displayCaption, setDisplayCaption] = useState("");
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    joinClass(accessCode)
      .then(setClassSession)
      .catch(() =>
        getClassByAccessCode(accessCode)
          .then(setClassSession)
          .catch(() =>
            setClassSession({
              id: 1,
              title: "Aula demo",
              subject_id: null,
              access_code: accessCode,
              status: "active",
            })
          )
      )
      .finally(() => setLoading(false));
  }, [accessCode]);

  useEffect(() => {
    if (!captionPaused && live.currentCaption) {
      setDisplayCaption(live.currentCaption);
    }
  }, [captionPaused, live.currentCaption]);

  const cards = useMemo(() => live.cards.slice(0, 10), [live.cards]);

  async function handleSaveWord(card?: SignCard) {
    const target = card ?? cards[0];
    if (!target) return;
    setSavedWords((current) => (current.includes(target.word) ? current : [target.word, ...current]));
    await saveWord({ sign_id: target.id, word: target.word, access_code: accessCode }).catch(() => undefined);
    setNotice(`Palavra salva: ${target.word}`);
    window.setTimeout(() => setNotice(null), 1800);
  }

  return (
    <main className={`min-h-screen bg-paper pb-28 text-ink dark:bg-zinc-950 dark:text-white ${highContrast ? "high-contrast" : ""}`}>
      <section className="sticky top-0 z-20 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-ocean dark:text-mint">LibrasLive Edu</p>
            <h1 className="text-base font-black leading-tight">{loading ? "Entrando na aula..." : classSession?.title}</h1>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${live.connected ? "bg-ocean text-white" : "bg-amber/20 text-ink dark:text-white"}`}>
            {live.connected ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
            {live.connected ? "ao vivo" : live.reconnecting ? "reconectando" : "demo"}
          </span>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4">
        {live.connectionError && (
          <div role="alert" className="rounded-lg bg-amber/20 p-3 text-sm font-bold text-ink dark:text-white">
            {live.connectionError}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-lg bg-ocean px-4 py-3 text-sm font-bold text-white">
            {notice}
          </div>
        )}

        <div className="sticky top-[73px] z-10">
          <AvatarPanel large status={live.translation.status} glossText={live.translation.glossText} />
        </div>

        <LiveCaption text={displayCaption || "Aguardando a fala do professor..."} enlarged={enlargedText} />

        <section aria-label="Cards visuais de palavras-chave" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Palavras-chave</h2>
            <button
              className="focus-ring rounded-lg bg-white px-3 py-2 text-sm font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint"
              onClick={() => handleSaveWord()}
              aria-label="Salvar primeira palavra-chave"
            >
              <BookmarkPlus className="inline h-4 w-4" aria-hidden="true" /> Salvar
            </button>
          </div>
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex min-w-full gap-3">
              {(cards.length ? cards : [{ word: "tecnologia", status: "pending", sourceName: "Seed educacional inicial" }]).map((card) => (
                <article key={`${card.word}-${card.id ?? card.status}`} className="w-64 shrink-0 rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
                  <h3 className="text-xl font-black">{card.word}</h3>
                  <p className="mt-2 text-sm font-semibold text-ink/65 dark:text-white/65">
                    {card.status === "approved" ? "Sinal aprovado" : "Pendente de curadoria"}
                  </p>
                  <button
                    className="focus-ring mt-4 min-h-11 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ocean dark:border-white/10 dark:bg-zinc-950 dark:text-mint"
                    onClick={() => handleSaveWord(card)}
                  >
                    Salvar palavra
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-lg font-black">Histórico dos últimos trechos</h2>
          <div className="mt-3 space-y-2">
            {(live.segments.length ? live.segments : [{ originalText: "Os trechos aparecerão aqui durante a aula." }]).map((segment, index) => (
              <p key={`${segment.id ?? index}-${segment.originalText}`} className="rounded-lg bg-teal-50 p-3 text-base font-semibold leading-relaxed dark:bg-zinc-800">
                {segment.originalText ?? segment.text}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-lg font-black">Palavras salvas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(savedWords.length ? savedWords : ["Nenhuma palavra salva ainda"]).map((word) => (
              <span key={word} className="rounded-full bg-amber/20 px-3 py-2 text-sm font-bold">
                {word}
              </span>
            ))}
          </div>
        </section>

        <AddToHomeScreen />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 px-3 py-2 shadow-soft backdrop-blur dark:border-white/10 dark:bg-zinc-950/95" aria-label="Ações da aula">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-2">
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => setEnlargedText((value) => !value)} aria-label="Aumentar texto">
            <Maximize2 className="mx-auto h-5 w-5" aria-hidden="true" />
            Texto
          </button>
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => setHighContrast((value) => !value)} aria-label="Alternar alto contraste">
            <Contrast className="mx-auto h-5 w-5" aria-hidden="true" />
            Contraste
          </button>
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => setCaptionPaused((value) => !value)} aria-label="Pausar legenda">
            <CaptionsOff className="mx-auto h-5 w-5" aria-hidden="true" />
            {captionPaused ? "Voltar" : "Pausar"}
          </button>
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={live.injectDemo} aria-label="Simular próximo trecho">
            <RotateCcw className="mx-auto h-5 w-5" aria-hidden="true" />
            Demo
          </button>
          <Link className="focus-ring rounded-lg px-2 py-2 text-center text-xs font-bold" href={`/review/${accessCode}`} aria-label="Revisar aula">
            <History className="mx-auto h-5 w-5" aria-hidden="true" />
            Revisar
          </Link>
        </div>
      </nav>
    </main>
  );
}
