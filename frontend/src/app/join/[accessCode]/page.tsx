"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, CaptionsOff, History, RotateCcw } from "lucide-react";
import { useParams } from "next/navigation";
import { AccessibleModeToggle } from "@/components/AccessibleModeToggle";
import { AvatarPanel } from "@/components/AvatarPanel";
import { ConnectionStatusBanner } from "@/components/ConnectionStatusBanner";
import { HelpButton } from "@/components/HelpButton";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { LiveCaption } from "@/components/LiveCaption";
import { LiveModeSelector, type LiveViewMode } from "@/components/LiveModeSelector";
import { getClassByAccessCode, joinClass, saveWord } from "@/services/api";
import type { ClassSession, SignCard } from "@/types/live";
import { useLiveClass } from "@/hooks/useLiveClass";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export default function JoinClassPage() {
  const params = useParams<{ accessCode: string }>();
  const accessCode = decodeURIComponent(params.accessCode ?? "AULA-4821").toUpperCase();
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const live = useLiveClass(accessCode, joinToken, "student");
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [enlargedText, setEnlargedText] = useState(true);
  const [captionPaused, setCaptionPaused] = useState(false);
  const [displayCaption, setDisplayCaption] = useState("");
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<LiveViewMode>("full");

  useEffect(() => {
    const queryToken = new URLSearchParams(window.location.search).get("token");
    if (queryToken) setJoinToken(queryToken);
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    joinClass(accessCode, token)
      .then((session) => {
        setClassSession(session);
        if (session.join_token && !token) setJoinToken(session.join_token);
      })
      .catch((error) => {
        if (String(error).includes("410")) {
          setNotice("Esta aula foi encerrada.");
          return;
        }
        return getClassByAccessCode(accessCode)
          .then(setClassSession)
          .catch(() => {
            if (demoMode) {
              setClassSession({ id: 1, title: "Aula demo", subject_id: null, access_code: accessCode, status: "active" });
            } else {
              setNotice("Nao foi possivel entrar nesta aula. Confira o codigo com o professor.");
            }
          });
      })
      .finally(() => setLoading(false));
  }, [accessCode]);

  useEffect(() => {
    if (!captionPaused && live.currentCaption) {
      setDisplayCaption(live.currentCaption);
    }
  }, [captionPaused, live.currentCaption]);

  useEffect(() => {
    const saved = window.localStorage.getItem(`libraslive.saved.${accessCode}`);
    if (saved) setSavedWords(JSON.parse(saved));
  }, [accessCode]);

  const cards = useMemo(() => live.cards.slice(0, 10), [live.cards]);
  const showAvatar = viewMode === "full" || viewMode === "focus";
  const showCaption = viewMode === "full" || viewMode === "focus" || viewMode === "caption";
  const showCards = viewMode === "full" || viewMode === "cards";

  async function handleSaveWord(card?: SignCard) {
    const target = card ?? cards[0];
    if (!target) return;
    const nextWords = savedWords.includes(target.word) ? savedWords : [target.word, ...savedWords];
    setSavedWords(nextWords);
    window.localStorage.setItem(`libraslive.saved.${accessCode}`, JSON.stringify(nextWords));
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
            <h1 className="text-base font-black leading-tight">{loading ? "Entrando na aula..." : classSession?.title ?? "Aula"}</h1>
          </div>
          <HelpButton />
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4">
        <ConnectionStatusBanner connected={live.connected} reconnecting={live.reconnecting} error={live.connectionError} />
        {notice && (
          <div role="status" className="rounded-lg bg-ocean px-4 py-3 text-sm font-bold text-white">
            {notice}
          </div>
        )}
        <LiveModeSelector value={viewMode} onChange={setViewMode} />
        <AccessibleModeToggle
          highContrast={highContrast}
          largeText={enlargedText}
          onHighContrast={() => setHighContrast((value) => !value)}
          onLargeText={() => setEnlargedText((value) => !value)}
        />

        {showAvatar && (
          <div className="sticky top-[73px] z-10">
            <AvatarPanel
              large
              status={live.translation.status}
              glossText={live.translation.glossText}
              avatarVideoUrl={live.translation.avatarVideoUrl}
              animationPayloadUrl={live.translation.animationPayloadUrl}
            />
          </div>
        )}

        {showCaption && (
          <LiveCaption text={displayCaption || "Aguardando a fala do professor..."} enlarged={enlargedText} />
        )}

        {showCards && (
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
                      {card.status === "approved" ? "Sinal aprovado" : "Este sinal ainda esta pendente de curadoria por especialista em Libras."}
                    </p>
                    <button className="focus-ring mt-4 min-h-11 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ocean dark:border-white/10 dark:bg-zinc-950 dark:text-mint" onClick={() => handleSaveWord(card)}>
                      Salvar palavra
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-lg font-black">Historico dos ultimos trechos</h2>
          <div className="mt-3 space-y-2">
            {(live.segments.length ? live.segments : [{ originalText: "Os trechos aparecerao aqui durante a aula." }]).map((segment, index) => (
              <p key={`${segment.id ?? index}-${segment.originalText}`} className="rounded-lg bg-teal-50 p-3 text-base font-semibold leading-relaxed dark:bg-zinc-800">
                {segment.originalText ?? segment.text}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <h2 className="text-lg font-black">Palavras salvas neste celular</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(savedWords.length ? savedWords : ["Nenhuma palavra salva ainda"]).map((word) => (
              <span key={word} className="rounded-full bg-amber/20 px-3 py-2 text-sm font-bold">
                {word}
              </span>
            ))}
          </div>
        </section>

        <InstallPWAButton />
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 px-3 py-2 shadow-soft backdrop-blur dark:border-white/10 dark:bg-zinc-950/95" aria-label="Acoes da aula">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-2">
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => setCaptionPaused((value) => !value)} aria-label="Pausar legenda">
            <CaptionsOff className="mx-auto h-5 w-5" aria-hidden="true" />
            {captionPaused ? "Voltar" : "Pausar"}
          </button>
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => handleSaveWord()} aria-label="Salvar palavra">
            <BookmarkPlus className="mx-auto h-5 w-5" aria-hidden="true" />
            Salvar
          </button>
          {demoMode ? (
            <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={live.injectDemo} aria-label="Simular proximo trecho">
              <RotateCcw className="mx-auto h-5 w-5" aria-hidden="true" />
              Demo
            </button>
          ) : (
            <span className="rounded-lg px-2 py-2 text-center text-xs font-bold text-ink/50 dark:text-white/50">Ao vivo</span>
          )}
          <Link className="focus-ring rounded-lg px-2 py-2 text-center text-xs font-bold" href={`/review/${accessCode}`} aria-label="Revisar aula">
            <History className="mx-auto h-5 w-5" aria-hidden="true" />
            Revisar
          </Link>
        </div>
      </nav>
    </main>
  );
}
