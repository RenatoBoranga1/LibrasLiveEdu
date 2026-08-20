"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, ChevronDown, Image as ImageIcon, RotateCcw, Trash2, Video, X } from "lucide-react";
import { useParams } from "next/navigation";
import { ConnectionStatusBanner } from "@/components/ConnectionStatusBanner";
import { HelpButton } from "@/components/HelpButton";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";
import { LiveCaption, type LiveCaptionStatus } from "@/components/LiveCaption";
import { LiveModeSelector, type LiveViewMode } from "@/components/LiveModeSelector";
import { LiveSummaryPanel } from "@/components/LiveSummaryPanel";
import { SequentialAvatarPlayer, type SequentialAvatarPlayerHandle } from "@/components/SequentialAvatarPlayer";
import { StudentAccessibilityBar } from "@/components/StudentAccessibilityBar";
import { getClassByAccessCode, getLiveSummaryByAccessCode, joinClass, saveWord } from "@/services/api";
import {
  CAPTION_SIZES,
  CAPTION_SIZE_STORAGE_KEY,
  clampCaptionSizeIndex,
  DEFAULT_CAPTION_SIZE_INDEX,
  HIGH_CONTRAST_STORAGE_KEY,
  normalizeSavedWords,
  readStudentPreferences,
  type CaptionSizeIndex,
} from "@/lib/studentPreferences";
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
  const [captionSizeIndex, setCaptionSizeIndex] = useState<CaptionSizeIndex>(DEFAULT_CAPTION_SIZE_INDEX);
  const [summaryTextScale, setSummaryTextScale] = useState<0 | 1 | 2>(0);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [captionPaused, setCaptionPaused] = useState(false);
  const [displayCaption, setDisplayCaption] = useState("");
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [initialSummary, setInitialSummary] = useState<LiveSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [classEnded, setClassEnded] = useState(false);
  const [viewMode, setViewMode] = useState<LiveViewMode>("full");
  const [videoCard, setVideoCard] = useState<SignCard | null>(null);
  const [avatarPaused, setAvatarPaused] = useState(false);
  const avatarPlayerRef = useRef<SequentialAvatarPlayerHandle | null>(null);

  useEffect(() => {
    const queryToken = new URLSearchParams(window.location.search).get("token");
    if (queryToken) setJoinToken(queryToken);
  }, []);

  useLayoutEffect(() => {
    const preferences = readStudentPreferences(window.localStorage);
    setCaptionSizeIndex(preferences.captionSizeIndex);
    setHighContrast(preferences.highContrast);
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem(CAPTION_SIZE_STORAGE_KEY, String(captionSizeIndex));
      window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(highContrast));
    } catch {
      // The classroom remains usable when browser storage is blocked.
    }
  }, [captionSizeIndex, highContrast, preferencesLoaded]);

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
    try {
      setSavedWords(normalizeSavedWords(window.localStorage.getItem(`libraslive.saved.${accessCode}`)));
    } catch {
      setSavedWords([]);
    }
  }, [accessCode]);

  useEffect(() => {
    if (!classSession) return;
    getLiveSummaryByAccessCode(accessCode).then(setInitialSummary).catch(() => null);
  }, [accessCode, classSession]);

  const cards = useMemo(() => live.cards.slice(0, 10), [live.cards]);
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
  const modalMedia = getCardMedia(videoCard);
  const focusMode = viewMode === "focus";
  const captionStatus: LiveCaptionStatus = classEnded
    ? "offline"
    : live.reconnecting
      ? "reconnecting"
      : captionPaused
        ? "paused"
        : displayCaption
          ? "receiving"
          : live.connected
            ? "waiting"
            : "offline";
  const captionText = classEnded
    ? "A aula foi encerrada. Você ainda pode revisar os trechos salvos."
    : live.reconnecting
      ? "Reconectando à aula. Aguarde um instante..."
      : displayCaption || (live.connected ? "Aguardando a fala do professor..." : "Aguardando conexão com a aula...");

  async function handleSaveWord(card?: SignCard) {
    const target = card ?? cards[0];
    if (!target) return;
    const nextWords = savedWords.includes(target.word) ? savedWords : [target.word, ...savedWords];
    setSavedWords(nextWords);
    try {
      window.localStorage.setItem(`libraslive.saved.${accessCode}`, JSON.stringify(nextWords));
    } catch {
      // Keep the in-memory action available when browser storage is blocked.
    }
    await saveWord({ sign_id: target.id, word: target.word, access_code: accessCode }).catch(() => undefined);
    setNotice(`Palavra salva: ${target.word}`);
    window.setTimeout(() => setNotice(null), 1800);
  }

  function clearSavedWords() {
    setSavedWords([]);
    try {
      window.localStorage.removeItem(`libraslive.saved.${accessCode}`);
    } catch {
      // The visible list is still cleared even when browser storage is blocked.
    }
    setNotice("Palavras salvas neste celular foram limpas.");
    window.setTimeout(() => setNotice(null), 1800);
  }

  function changeCaptionSize(direction: -1 | 1) {
    setCaptionSizeIndex((current) => clampCaptionSizeIndex(current + direction));
  }

  function toggleFocusMode() {
    setViewMode((current) => current === "focus" ? "full" : "focus");
  }

  function toggleAvatarPlayback() {
    if (avatarPaused) {
      avatarPlayerRef.current?.resume();
    } else {
      avatarPlayerRef.current?.pause();
    }
  }

  return (
    <main className={`student-classroom min-h-screen w-full max-w-full overflow-x-clip bg-paper pb-40 text-ink dark:bg-zinc-950 dark:text-white lg:pb-32 ${highContrast ? "high-contrast" : ""}`}>
      <header className="sticky top-0 z-20 w-full max-w-full overflow-hidden border-b border-ink/10 bg-paper/95 py-2 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <LibrasLiveLogo compact />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ocean dark:text-mint">Ambiente do aluno</p>
              <h1 className="truncate text-base font-black leading-tight sm:text-lg">{loading ? "Entrando na aula..." : classSession?.title ?? "Aula"}</h1>
              <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Legenda ao vivo e apoio visual em Libras</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`hidden min-h-9 items-center gap-2 rounded-full px-3 py-1 text-xs font-black sm:inline-flex ${live.connected ? "bg-mint text-ink" : "bg-amber/40 text-ink dark:text-white"}`} role="status">
              <span className={`h-2.5 w-2.5 rounded-full ${live.connected ? "bg-ocean" : "bg-amber-strong"}`} aria-hidden="true" />
              {connectionLabel}
            </span>
            <HelpButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:px-8">
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
        {demoMode && !focusMode && (
          <button
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 justify-self-start rounded-lg bg-amber px-4 py-2 text-sm font-black text-ink"
            onClick={live.injectDemo}
            aria-label="Testar acessibilidade com trecho local de demonstração"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Testar acessibilidade
          </button>
        )}

        {showCaption && (
          <LiveCaption
            text={captionText}
            size={CAPTION_SIZES[captionSizeIndex]}
            status={captionStatus}
            paused={captionPaused}
            onTogglePause={() => setCaptionPaused((value) => !value)}
          />
        )}

        {(showAvatar || showCaption) && (
          <div className={`grid min-w-0 max-w-full items-start gap-4 ${showAvatar && showCaption && !focusMode ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]" : ""}`}>
            {showAvatar && (
              <div className="min-w-0 max-w-full overflow-hidden">
                <SequentialAvatarPlayer
                  ref={avatarPlayerRef}
                  items={live.avatarItems}
                  onPlaybackStateChange={setAvatarPaused}
                />
              </div>
            )}
            {showCaption && (
              <div className="min-w-0 max-w-full overflow-hidden">
                <LiveSummaryPanel
                  summaryText={visibleSummary?.summaryText}
                  bulletPoints={visibleSummary?.bulletPoints}
                  keywords={visibleSummary?.keywords}
                  updatedAt={visibleSummary?.updatedAt}
                  generatedBy={visibleSummary?.generatedBy}
                  isAutoGenerated={visibleSummary?.isAutoGenerated}
                  textScale={summaryTextScale}
                  onIncreaseText={() => setSummaryTextScale((value) => Math.min(2, value + 1) as 0 | 1 | 2)}
                  onDecreaseText={() => setSummaryTextScale((value) => Math.max(0, value - 1) as 0 | 1 | 2)}
                  collapsible
                  defaultOpen
                />
              </div>
            )}
          </div>
        )}

        {!focusMode && (
          <details className="rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-sm font-black text-ocean dark:text-mint">
              Opções de visualização
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </summary>
            <div className="mt-3 max-w-xl">
              <LiveModeSelector value={viewMode} onChange={setViewMode} />
            </div>
          </details>
        )}

        {showCards && !focusMode && (
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
                  const mediaInfo = approved ? getCardMedia(card) : null;
                  const mediaLabel =
                    mediaInfo?.type === "video"
                      ? "Com vídeo"
                      : mediaInfo?.type === "gif"
                        ? "Com GIF"
                        : mediaInfo?.type === "image"
                          ? "Com imagem de apoio"
                          : "Sem mídia";
                  return (
                    <article key={`${card.word}-${card.id ?? card.status}`} className="w-72 shrink-0 rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 break-words text-xl font-black [overflow-wrap:anywhere]">{card.word}</h3>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`rounded-full px-2 py-1 text-xs font-black ${approved ? "bg-ocean text-white" : unavailable ? "bg-zinc-200 text-ink" : "bg-amber/20 text-ink dark:text-white"}`}>
                            {statusLabel}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${mediaInfo ? "bg-mint text-ink" : "bg-zinc-200 text-ink"}`}>
                            {mediaInfo?.type === "video" && <Video className="h-3.5 w-3.5" aria-hidden="true" />}
                            {(mediaInfo?.type === "gif" || mediaInfo?.type === "image") && <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                            {mediaLabel}
                          </span>
                        </div>
                      </div>
                      {mediaInfo?.type === "gif" && (
                        <img
                          className="mt-3 h-28 w-full rounded-lg bg-ink object-contain"
                          src={mediaInfo.url}
                          alt={`Preview do GIF do sinal ${card.word}`}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="mt-3 space-y-1 text-xs font-bold leading-relaxed text-ink/65 dark:text-white/65">
                        {approved && card.gloss && <p>Glosa: {card.gloss}</p>}
                        {card.sourceName && <p>Fonte: {card.sourceName}</p>}
                        {card.license && <p>Licença: {card.license}</p>}
                        {card.licenseNotes && <p>Autorização: {card.licenseNotes}</p>}
                        {card.sourceReferenceUrl && <p>Referência cadastrada.</p>}
                        {!approved && !unavailable && <p>Este sinal ainda está pendente de curadoria por especialista em Libras.</p>}
                      </div>
                      <div className="mt-4 grid gap-2">
                        {mediaInfo && (
                          <button
                            className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-ocean px-3 py-2 text-sm font-bold text-white"
                            onClick={() => setVideoCard(card)}
                          >
                            {mediaInfo.type === "image" ? "Ver apoio visual" : "Ver sinal"}
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

        {!focusMode && (
          <>
            <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-lg font-black">Histórico dos últimos trechos</h2>
              <div className="mt-3 space-y-2">
                {(live.segments.length ? live.segments : [{ originalText: "Os trechos aparecerão aqui durante a aula." }]).map((segment, index) => (
                  <p key={`${segment.id ?? index}-${segment.originalText}`} className="max-w-full whitespace-pre-wrap break-words rounded-lg bg-teal-50 p-3 text-base font-semibold leading-relaxed [overflow-wrap:anywhere] dark:bg-zinc-800">
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
                  <span key={word} className="max-w-full break-words rounded-lg bg-amber/20 px-3 py-2 text-sm font-bold [overflow-wrap:anywhere]">
                    {word}
                  </span>
                ))}
              </div>
            </section>

            <InstallPWAButton />
          </>
        )}
      </div>

      {videoCard && modalMedia && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="sign-video-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-soft dark:bg-zinc-900">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-ocean dark:text-mint">
                  {modalMedia.type === "image" ? "Apoio visual" : "Sinal em Libras"}
                </p>
                <h2 id="sign-video-title" className="text-2xl font-black text-ink dark:text-white">
                  {videoCard.word}
                </h2>
              </div>
              <button
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-100 px-3 text-ink dark:bg-zinc-800 dark:text-white"
                onClick={() => setVideoCard(null)}
                aria-label="Fechar mídia do sinal"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {modalMedia.type === "video" ? (
              <video
                className="max-h-[52vh] w-full rounded-lg bg-ink object-contain"
                src={modalMedia.url}
                controls
                controlsList="nodownload"
                playsInline
                preload="metadata"
                aria-label="Vídeo do sinal em Libras"
              />
            ) : (
              <img
                className="max-h-[52vh] w-full rounded-lg bg-ink object-contain"
                src={modalMedia.url}
                alt={`${modalMedia.type === "gif" ? "GIF" : "Imagem de apoio"} do sinal ${videoCard.word}`}
                loading="lazy"
                decoding="async"
              />
            )}
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

      <StudentAccessibilityBar
        highContrast={highContrast}
        focusMode={focusMode}
        avatarPaused={avatarPaused}
        canSaveWord={cards.length > 0}
        reviewHref={`/review/${accessCode}`}
        canDecreaseText={captionSizeIndex > 0}
        canIncreaseText={captionSizeIndex < CAPTION_SIZES.length - 1}
        onDecreaseText={() => changeCaptionSize(-1)}
        onIncreaseText={() => changeCaptionSize(1)}
        onToggleContrast={() => setHighContrast((value) => !value)}
        onToggleFocus={toggleFocusMode}
        onToggleAvatar={toggleAvatarPlayback}
        onRepeatSignal={() => avatarPlayerRef.current?.repeat()}
        onSaveWord={() => handleSaveWord()}
      />
    </main>
  );
}

function getCardMedia(card?: SignCard | null): { type: "video" | "gif" | "image"; url: string } | null {
  if (!card) return null;
  const videoUrl = card.avatarVideoUrl || card.videoUrl;
  if (videoUrl) return { type: "video", url: videoUrl };
  if (card.avatarGifUrl) return { type: "gif", url: card.avatarGifUrl };
  if (card.imageUrl) return { type: "image", url: card.imageUrl };
  return null;
}
