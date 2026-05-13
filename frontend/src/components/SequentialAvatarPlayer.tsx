"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Image as ImageIcon, Info, Pause, Play, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { LibrasLiveMascot } from "@/components/LibrasLiveMascot";
import type { SignCard } from "@/types/live";

const DEFAULT_MAX_QUEUE = 20;
const DEFAULT_GIF_DURATION_MS = 3200;
const DEFAULT_ANIMATION_DURATION_MS = 3500;

type QueueMediaType = "video" | "gif" | "animation";

export type AvatarMediaQueueItem = {
  key: string;
  word: string;
  normalizedWord?: string | null;
  mediaType: QueueMediaType;
  mediaUrl: string;
  imageUrl?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceReferenceUrl?: string | null;
  license?: string | null;
  licenseNotes?: string | null;
};

export function SequentialAvatarPlayer({
  items,
  maxQueue = DEFAULT_MAX_QUEUE,
  gifDurationMs = DEFAULT_GIF_DURATION_MS,
  animationDurationMs = DEFAULT_ANIMATION_DURATION_MS,
}: {
  items: SignCard[];
  maxQueue?: number;
  gifDurationMs?: number;
  animationDurationMs?: number;
}) {
  const [queue, setQueue] = useState<AvatarMediaQueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<AvatarMediaQueueItem | null>(null);
  const [paused, setPaused] = useState(false);
  const [needsActivation, setNeedsActivation] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [playedCount, setPlayedCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const processedKeysRef = useRef<Set<string>>(new Set());
  const currentItemRef = useRef<AvatarMediaQueueItem | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    currentItemRef.current = currentItem;
  }, [currentItem]);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;

    const syncPreference = () => {
      setReducedMotion(query.matches);
      if (query.matches) setPaused(true);
    };

    syncPreference();
    query.addEventListener?.("change", syncPreference);
    return () => query.removeEventListener?.("change", syncPreference);
  }, []);

  useEffect(() => {
    const nextItems = items.map(toQueueItem).filter((item): item is AvatarMediaQueueItem => Boolean(item));
    if (!nextItems.length) return;

    setQueue((currentQueue) => {
      const nextQueue = [...currentQueue];
      for (const item of nextItems) {
        if (processedKeysRef.current.has(item.key)) continue;

        processedKeysRef.current.add(item.key);
        const previous = nextQueue[nextQueue.length - 1] ?? currentItemRef.current;
        if (previous && sameImmediateWord(previous, item)) continue;

        nextQueue.push(item);
      }
      return nextQueue.slice(-maxQueue);
    });
  }, [items, maxQueue]);

  useEffect(() => {
    if (paused || currentItem || !queue.length) return;
    const [nextItem, ...remaining] = queue;
    setCurrentItem(nextItem);
    setQueue(remaining);
    setPlayerKey((value) => value + 1);
  }, [currentItem, paused, queue]);

  useEffect(() => {
    if (paused || !currentItem) return;
    if (currentItem.mediaType !== "gif" && currentItem.mediaType !== "animation") return;

    const duration = currentItem.mediaType === "gif" ? gifDurationMs : animationDurationMs;
    const timer = window.setTimeout(() => advance(), duration);
    return () => window.clearTimeout(timer);
  }, [animationDurationMs, currentItem, gifDurationMs, paused, playerKey]);

  const upcomingWords = useMemo(() => queue.slice(0, 5).map((item) => item.word), [queue]);
  const referenceUrl = currentItem?.sourceReferenceUrl || currentItem?.sourceUrl;
  const latestSupportImage = useMemo(() => {
    const support = [...items].reverse().find((item) => item.status === "approved" && !hasAnimatedMedia(item) && item.imageUrl);
    return support?.imageUrl ? { word: support.word, url: support.imageUrl } : null;
  }, [items]);

  function advance() {
    setPlayedCount((count) => count + (currentItemRef.current ? 1 : 0));
    setCurrentItem(null);
    setPlayerKey((value) => value + 1);
  }

  function pauseQueue() {
    setPaused(true);
    videoRef.current?.pause();
  }

  function resumeQueue() {
    setNeedsActivation(false);
    setPaused(false);
    if (currentItem?.mediaType === "video" && videoRef.current) {
      void tryPlay(videoRef.current);
    }
  }

  function repeatCurrent() {
    if (!currentItem) return;
    setPlayerKey((value) => value + 1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (!paused) void tryPlay(videoRef.current);
    }
  }

  async function tryPlay(video: HTMLVideoElement) {
    try {
      const promise = video.play();
      if (promise) await promise;
      setNeedsActivation(false);
    } catch {
      setNeedsActivation(true);
      setPaused(true);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-ocean/20 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900" aria-label="Avatar Libras">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <LibrasLiveMascot size={42} variant="compact" decorative />
            <h2 className="text-lg font-black text-ink dark:text-white">Avatar Libras</h2>
          </div>
          <p className="text-xs font-bold text-ink/60 dark:text-white/60">fila automatica de sinais aprovados</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-ocean/10 px-3 py-1 text-xs font-black text-ocean dark:bg-mint/10 dark:text-mint" aria-live="polite">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          {paused ? "Pausado" : currentItem ? "Reproduzindo automaticamente" : "Aguardando sinal"}
        </span>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_240px]">
        <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-lg bg-ink text-white">
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-black/30 px-3 py-2 text-xs font-bold">
            <span aria-live="polite">{currentItem ? `Sinal atual: ${currentItem.word}` : "Sem sinal animado na fila"}</span>
            <span>{currentItem?.mediaType?.toUpperCase() ?? "FILA"}</span>
          </div>

          {currentItem?.mediaType === "video" ? (
            <video
              key={`${currentItem.key}-${playerKey}`}
              ref={videoRef}
              className="h-full max-h-96 w-full rounded-lg object-contain"
              src={currentItem.mediaUrl}
              autoPlay={!paused}
              muted
              playsInline
              preload="auto"
              controls={false}
              controlsList="nodownload"
              onLoadedData={(event) => {
                if (!paused) void tryPlay(event.currentTarget);
              }}
              onEnded={advance}
              onError={advance}
              aria-label={`Video do sinal em Libras para ${currentItem.word}`}
            />
          ) : currentItem?.mediaType === "gif" ? (
            <img
              key={`${currentItem.key}-${playerKey}`}
              className="h-full max-h-96 w-full rounded-lg object-contain"
              src={currentItem.mediaUrl}
              alt={`Sinal em Libras para ${currentItem.word}`}
              loading="lazy"
              decoding="async"
            />
          ) : currentItem?.mediaType === "animation" ? (
            <div className="flex max-w-md flex-col items-center gap-4 px-5 py-10 text-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-mint text-ink shadow-soft">
                <Sparkles className="h-12 w-12" aria-hidden="true" />
              </div>
              <p className="text-base font-black">Animacao do sinal {currentItem.word} recebida.</p>
              <a className="focus-ring rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean" href={currentItem.mediaUrl} target="_blank" rel="noreferrer">
                Abrir animacao
              </a>
            </div>
          ) : (
            <div className="flex max-w-md flex-col items-center gap-4 px-5 py-10 text-center">
              <LibrasLiveMascot
                size={150}
                variant="empty"
                ariaLabel="Liva, mascote do LibrasLive Edu aguardando sinal em Libras"
                className="drop-shadow-lg"
              />
              <p className="text-base font-black leading-relaxed">Aguardando sinal em Libras</p>
              <p className="text-sm font-semibold leading-relaxed text-white/75">A legenda continua ativa; o Avatar tocara quando houver video, GIF ou animacao aprovada.</p>
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3">
          {needsActivation && (
            <button className="focus-ring rounded-lg bg-amber px-3 py-3 text-sm font-black text-ink" onClick={resumeQueue}>
              Toque uma vez para ativar a reproducao automatica do Avatar.
            </button>
          )}

          {reducedMotion && (
            <div role="status" className="rounded-lg bg-amber/20 p-3 text-sm font-bold leading-relaxed text-ink dark:text-white">
              Movimento reduzido ativo. Use Retomar para reproduzir a sequencia.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button className="focus-ring inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-black text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint" onClick={pauseQueue} aria-label="Pausar avatar">
              <Pause className="h-4 w-4" aria-hidden="true" />
              Pausar
            </button>
            <button className="focus-ring inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-ocean px-2 py-2 text-xs font-black text-white" onClick={resumeQueue} aria-label={reducedMotion && paused ? "Reproduzir sequencia do avatar" : "Retomar avatar"}>
              <Play className="h-4 w-4" aria-hidden="true" />
              {reducedMotion && paused ? "Reproduzir" : "Retomar"}
            </button>
            <button className="focus-ring inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-black text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint" onClick={repeatCurrent} disabled={!currentItem} aria-label="Repetir sinal atual">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Repetir
            </button>
          </div>
          <button className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-black text-ocean dark:bg-zinc-800 dark:text-mint" onClick={advance} disabled={!currentItem} aria-label="Pular para o proximo sinal">
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            Pular sinal
          </button>

          <div className="rounded-lg border border-ink/10 bg-teal-50 p-3 dark:border-white/10 dark:bg-zinc-800" aria-live="polite">
            <p className="text-sm font-black text-ink dark:text-white">Sinal atual</p>
            <p className="mt-1 text-xl font-black text-ocean dark:text-mint">{currentItem?.word ?? "Aguardando"}</p>
            <p className="mt-2 text-xs font-bold text-ink/65 dark:text-white/65">Reproduzidos nesta aula: {playedCount}</p>
          </div>

          <div className="rounded-lg bg-white p-3 text-xs font-bold leading-relaxed text-ink/75 shadow-soft dark:bg-zinc-950 dark:text-white/75">
            <p className="font-black text-ink dark:text-white">Na fila</p>
            <p className="mt-1">{upcomingWords.length ? upcomingWords.join(", ") : "Nenhum sinal aguardando."}</p>
          </div>

          {currentItem && (
            <div className="rounded-lg bg-white p-3 text-xs font-bold leading-relaxed text-ink/75 shadow-soft dark:bg-zinc-950 dark:text-white/75">
              <p>Palavra: {currentItem.word}</p>
              {currentItem.sourceName && <p>Fonte: {currentItem.sourceName}</p>}
              {currentItem.license && <p className="mt-1">Licenca/autorizacao: {currentItem.license}</p>}
              {currentItem.licenseNotes && <p className="mt-1">Observacao: {currentItem.licenseNotes}</p>}
              {referenceUrl && (
                <a className="focus-ring mt-2 inline-flex min-h-9 items-center rounded-lg bg-teal-50 px-3 py-2 text-ocean dark:bg-zinc-800 dark:text-mint" href={referenceUrl} target="_blank" rel="noreferrer">
                  Abrir fonte
                </a>
              )}
            </div>
          )}

          {latestSupportImage && !currentItem && (
            <div role="status" className="rounded-lg bg-amber/20 p-3 text-sm font-bold leading-relaxed text-ink dark:text-white">
              <div className="mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                Imagem de apoio
              </div>
              <p>Imagem de apoio para {latestSupportImage.word}. Nao representa o movimento completo em Libras.</p>
            </div>
          )}

          <div className="rounded-lg bg-amber/20 p-3 text-xs font-bold leading-relaxed text-ink/80 dark:text-white/80">
            <div className="mb-1 flex items-center gap-2 text-ink dark:text-white">
              <Info className="h-4 w-4" aria-hidden="true" />
              Limite importante
            </div>
            O app apoia acessibilidade, mas nao substitui interprete humano ou revisao especializada em Libras.
          </div>
        </aside>
      </div>
    </section>
  );
}

function toQueueItem(card: SignCard): AvatarMediaQueueItem | null {
  if (card.status !== "approved") return null;
  const videoUrl = card.avatarVideoUrl || card.videoUrl;
  const mediaUrl = videoUrl || card.avatarGifUrl || card.avatarAnimationUrl;
  if (!mediaUrl) return null;
  const mediaType: QueueMediaType = videoUrl ? "video" : card.avatarGifUrl ? "gif" : "animation";

  return {
    key: card.queueKey || `${card.id ?? card.word}-${mediaType}-${mediaUrl}`,
    word: card.word,
    normalizedWord: card.normalizedWord,
    mediaType,
    mediaUrl,
    imageUrl: card.imageUrl,
    sourceName: card.sourceName,
    sourceUrl: card.sourceUrl,
    sourceReferenceUrl: card.sourceReferenceUrl,
    license: card.license,
    licenseNotes: card.licenseNotes,
  };
}

function hasAnimatedMedia(card: SignCard) {
  return Boolean(card.avatarVideoUrl || card.videoUrl || card.avatarGifUrl || card.avatarAnimationUrl);
}

function sameImmediateWord(previous: AvatarMediaQueueItem, next: AvatarMediaQueueItem) {
  const previousKey = (previous.normalizedWord || previous.word).trim().toLowerCase();
  const nextKey = (next.normalizedWord || next.word).trim().toLowerCase();
  return previousKey === nextKey;
}
