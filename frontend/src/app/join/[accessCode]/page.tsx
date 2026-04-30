"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, CaptionsOff, History, Maximize2, Minimize2, RotateCcw, Trash2, Video, X } from "lucide-react";
import { useParams } from "next/navigation";
import { AccessibleModeToggle } from "@/components/AccessibleModeToggle";
import { AvatarPanel } from "@/components/AvatarPanel";
import { ConnectionStatusBanner } from "@/components/ConnectionStatusBanner";
import { HelpButton } from "@/components/HelpButton";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { LiveCaption } from "@/components/LiveCaption";
import { LiveModeSelector, type LiveViewMode } from "@/components/LiveModeSelector";
import { LiveSummaryPanel } from "@/components/LiveSummaryPanel";
import { getClassByAccessCode, getLiveSummaryByAccessCode, joinClass, saveWord } from "@/services/api";
import type { ClassSession, LiveSummary, SignCard } from "@/types/live";
import { useLiveClass } from "@/hooks/useLiveClass";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function JoinClassPage() {
  const params = useParams<{ accessCode: string }>();
  const accessCode = decodeURIComponent(params.accessCode ?? (demoMode ? "AULA-4821" : "")).toUpperCase();
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const live = useLiveClass(accessCode, joinToken, "student");
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [enlargedText, setEnlargedText] = useState(true);
  const [captionPaused, setCaptionPaused] = useState(false);
  const [displayCaption, setDisplayCaption] = useState("");
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [initialSummary, setInitialSummary] = useState<LiveSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [classEnded, setClassEnded] = useState(false);
  const [viewMode, setViewMode] = useState<LiveViewMode>("full");
  const [videoCard, setVideoCard] = useState<SignCard | null>(null);

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
          setClassEnded(true);
          return;
        }
        return getClassByAccessCode(accessCode)
          .then(setClassSession)
          .catch(() => {
            if (demoMode) {
              setClassSession({ id: 1, title: "Aula demo", subject_id: null, access_code: accessCode, status: "active" });
            } else {
              setNotice("Não encontramos essa aula. Confira o código com o professor e tente novamente.");
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
    if (live.connectionError?.toLowerCase().includes("encerrada")) {
      setClassEnded(true);
    }
  }, [live.connectionError]);

  useEffect(() => {
    const saved = window.localStorage.getItem(`libraslive.saved.${accessCode}`);
    if (saved) setSavedWords(JSON.parse(saved));
  }, [accessCode]);

  useEffect(() => {
    if (!classSession) return;
    getLiveSummaryByAccessCode(accessCode).then(setInitialSummary).catch(() => null);
  }, [accessCode, classSession]);

  const cards = useMemo(() => live.cards.slice(0, 10), [live.cards]);
  const approvedMediaCard = useMemo(
    () => cards.find((card) => card.status === "approved" && (card.avatarVideoUrl || card.videoUrl || card.avatarAnimationUrl || card.gloss)),
    [cards]
  );
  const showAvatar = viewMode === "full" || viewMode === "focus";
  const showCaption = viewMode === "full" || viewMode === "focus" || viewMode === "caption";
  const showCards = viewMode === "full" || viewMode === "cards";
  const visibleSummary = live.liveSummary ?? initialSummary;
  const connectionLabel = classEnded
    ? "Aula encerrada"
    : live.connected
      ? "Conectado"
      : live.reconnecting
        ? "Tentando reconectar"
        : "Aguardando professor";
  const modalVideoUrl = videoCard?.avatarVideoUrl ?? videoCard?.videoUrl ?? null;

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

  function clearSavedWords() {
    setSavedWords([]);
    window.localStorage.removeItem(`libraslive.saved.${accessCode}`);
    setNotice("Palavras salvas neste celular foram limpas.");
    window.setTimeout(() => setNotice(null), 1800);
  }

  return (
    <main className={`min-h-screen bg-paper pb-28 text-ink dark:bg-zinc-950 dark:text-white ${highContrast ? "high-contrast" : ""}`}>
      <section className="sticky top-0 z-20 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-ocean dark:text-mint">LibrasLive Edu</p>
            <h1 className="text-base font-black leading-tight">{loading ? "Entrando na aula..." : classSession?.title ?? "Aula"}</h1>
            <p className="mt-1 text-xs font-bold text-ink/65 dark:text-white/65">{connectionLabel}</p>
          </div>
          <HelpButton />
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-4">
        <ConnectionStatusBanner connected={live.connected} reconnecting={live.reconnecting} error={live.connectionError} label={connectionLabel} />
        {notice && (
          <div role="status" className="rounded-lg bg-ocean px-4 py-3 text-sm font-bold text-white">
            {notice}
          </div>
        )}
        {(classEnded || !classSession) && !loading && (
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/aluno">
            Voltar para entrar com outro código
          </Link>
        )}
        <LiveModeSelector value={viewMode} onChange={setViewMode} />
        <AccessibleModeToggle
          highContrast={highContrast}
          largeText={enlargedText}
          onHighContrast={() => setHighContrast((value) => !value)}
          onLargeText={() => setEnlargedText((value) => !value)}
        />
        {demoMode && (
          <button
            className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber px-4 py-3 text-sm font-black text-ink shadow-soft hover:bg-yellow-400"
            onClick={live.injectDemo}
            aria-label="Testar acessibilidade com trecho local de demonstração"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Testar acessibilidade
          </button>
        )}

        {showAvatar && (
          <div className="sticky top-[73px] z-10">
            <AvatarPanel
              large
              status={live.translation.status}
              word={approvedMediaCard?.word}
              glossText={live.translation.glossText || approvedMediaCard?.gloss}
              avatarVideoUrl={live.translation.avatarVideoUrl || approvedMediaCard?.avatarVideoUrl}
              videoUrl={approvedMediaCard?.videoUrl}
              animationPayloadUrl={live.translation.animationPayloadUrl || approvedMediaCard?.avatarAnimationUrl}
              sourceName={approvedMediaCard?.sourceName}
              sourceUrl={approvedMediaCard?.sourceUrl}
              sourceReferenceUrl={approvedMediaCard?.sourceReferenceUrl}
              license={approvedMediaCard?.license}
              licenseNotes={approvedMediaCard?.licenseNotes}
              providerConfigured={live.translation.providerConfigured}
              warningMessage={live.translation.warningMessage}
              cards={cards}
            />
          </div>
        )}

        {showCaption && (
          <LiveCaption text={displayCaption || "Aguardando a fala do professor..."} enlarged={enlargedText} />
        )}

        {showCaption && (
          <LiveSummaryPanel
            summaryText={visibleSummary?.summaryText}
            bulletPoints={visibleSummary?.bulletPoints}
            keywords={visibleSummary?.keywords}
            updatedAt={visibleSummary?.updatedAt}
            generatedBy={visibleSummary?.generatedBy}
            isAutoGenerated={visibleSummary?.isAutoGenerated}
            enlarged={enlargedText}
            collapsible
            defaultOpen={false}
          />
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
                {(cards.length ? cards : [{ word: "tecnologia", status: "pending", sourceName: "Seed educacional inicial" }]).map((card) => {
                  const approved = card.status === "approved";
                  const unavailable = card.status === "unavailable" || card.status === "missing";
                  const statusLabel = approved ? "Sinal aprovado" : unavailable ? "Sinal ainda não cadastrado" : "Aguardando curadoria";
                  const mediaUrl = approved ? card.avatarVideoUrl ?? card.videoUrl : null;
                  return (
                    <article key={`${card.word}-${card.id ?? card.status}`} className="w-72 shrink-0 rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xl font-black">{card.word}</h3>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-1 text-xs font-black ${approved ? "bg-ocean text-white" : unavailable ? "bg-zinc-200 text-ink" : "bg-amber/20 text-ink dark:text-white"}`}>
                            {statusLabel}
                          </span>
                          {mediaUrl && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-1 text-xs font-black text-ink">
                              <Video className="h-3.5 w-3.5" aria-hidden="true" />
                              Com vídeo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-xs font-bold leading-relaxed text-ink/65 dark:text-white/65">
                        {approved && card.gloss && <p>Glosa: {card.gloss}</p>}
                        {card.sourceName && <p>Fonte: {card.sourceName}</p>}
                        {card.license && <p>Licença: {card.license}</p>}
                        {card.licenseNotes && <p>Autorização: {card.licenseNotes}</p>}
                        {card.sourceReferenceUrl && <p>Referência cadastrada.</p>}
                        {!approved && !unavailable && <p>Este sinal ainda está pendente de curadoria por especialista em Libras.</p>}
                      </div>
                      <div className="mt-4 grid gap-2">
                        {mediaUrl && (
                          <button
                            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-ocean px-3 py-2 text-sm font-bold text-white"
                            onClick={() => setVideoCard(card)}
                          >
                            Ver sinal
                          </button>
                        )}
                        <button className="focus-ring min-h-11 w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-bold text-ocean dark:border-white/10 dark:bg-zinc-950 dark:text-mint" onClick={() => handleSaveWord(card)}>
                          Salvar palavra
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black">Palavras salvas neste celular</h2>
            <button
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint"
              onClick={clearSavedWords}
              aria-label="Limpar palavras salvas"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Limpar palavras salvas
            </button>
          </div>
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

      {videoCard && modalVideoUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="sign-video-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-soft dark:bg-zinc-900">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-ocean dark:text-mint">Sinal em Libras</p>
                <h2 id="sign-video-title" className="text-2xl font-black text-ink dark:text-white">
                  {videoCard.word}
                </h2>
              </div>
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-100 px-3 text-ink dark:bg-zinc-800 dark:text-white"
                onClick={() => setVideoCard(null)}
                aria-label="Fechar vídeo do sinal"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <video
              className="max-h-[52vh] w-full rounded-lg bg-ink object-contain"
              src={modalVideoUrl}
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              aria-label="Vídeo do sinal em Libras"
            />
            <div className="mt-4 space-y-2 rounded-lg bg-teal-50 p-3 text-sm font-bold leading-relaxed text-ink/75 dark:bg-zinc-800 dark:text-white/75">
              {videoCard.gloss && <p>Glosa: {videoCard.gloss}</p>}
              {videoCard.sourceName && <p>Fonte: {videoCard.sourceName}</p>}
              {videoCard.license && <p>Licença/autorização: {videoCard.license}</p>}
              {videoCard.licenseNotes && <p>Observação: {videoCard.licenseNotes}</p>}
              {(videoCard.sourceReferenceUrl || videoCard.sourceUrl) && (
                <a
                  className="focus-ring inline-flex min-h-10 items-center rounded-lg bg-white px-3 py-2 text-ocean dark:bg-zinc-950 dark:text-mint"
                  href={videoCard.sourceReferenceUrl || videoCard.sourceUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir fonte cadastrada
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 px-3 py-2 shadow-soft backdrop-blur dark:border-white/10 dark:bg-zinc-950/95" aria-label="Ações da aula">
        <div className="mx-auto grid max-w-5xl grid-cols-6 gap-1">
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => setCaptionPaused((value) => !value)} aria-label="Pausar legenda">
            <CaptionsOff className="mx-auto h-5 w-5" aria-hidden="true" />
            {captionPaused ? "Voltar" : "Pausar"}
          </button>
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => setEnlargedText(true)} aria-label="Aumentar legenda">
            <Maximize2 className="mx-auto h-5 w-5" aria-hidden="true" />
            Aumentar
          </button>
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => setEnlargedText(false)} aria-label="Reduzir legenda">
            <Minimize2 className="mx-auto h-5 w-5" aria-hidden="true" />
            Reduzir
          </button>
          <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={() => handleSaveWord()} aria-label="Salvar palavra">
            <BookmarkPlus className="mx-auto h-5 w-5" aria-hidden="true" />
            Salvar
          </button>
          {demoMode ? (
            <button className="focus-ring rounded-lg px-2 py-2 text-xs font-bold" onClick={live.injectDemo} aria-label="Testar acessibilidade">
              <RotateCcw className="mx-auto h-5 w-5" aria-hidden="true" />
              Testar
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
