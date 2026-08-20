"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { BadgeCheck, Image as ImageIcon, Info, Pause, Play, RotateCcw, SkipForward, Sparkles, Trash2 } from "lucide-react";
import { LibrasLiveIcon } from "@/components/LibrasLiveIcon";
import { LibrasLiveWelcomeVisual } from "@/components/brand/LibrasLiveWelcomeVisual";
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

export type SequentialAvatarPlayerHandle = {
  pause: () => void;
  resume: () => void;
  repeat: () => void;
};

export const SequentialAvatarPlayer = forwardRef<SequentialAvatarPlayerHandle, {
  items: SignCard[];
  maxQueue?: number;
  gifDurationMs?: number;
  animationDurationMs?: number;
  onPlaybackStateChange?: (paused: boolean) => void;
}>(function SequentialAvatarPlayer({
  items,
  maxQueue = DEFAULT_MAX_QUEUE,
  gifDurationMs = DEFAULT_GIF_DURATION_MS,
  animationDurationMs = DEFAULT_ANIMATION_DURATION_MS,
  onPlaybackStateChange,
}, ref) {
  const [queue, setQueue] = useState<AvatarMediaQueueItem[]>([]);
  const [currentItem, setCurrentItem] = useState<AvatarMediaQueueItem | null>(null);
  const [lastPlayedItem, setLastPlayedItem] = useState<AvatarMediaQueueItem | null>(null);
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
    onPlaybackStateChange?.(paused);
  }, [onPlaybackStateChange, paused]);

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
    if (currentItemRef.current) {
      setLastPlayedItem(currentItemRef.current);
      setPlayedCount((count) => count + 1);
    }
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
    const target = currentItemRef.current ?? lastPlayedItem;
    if (!target) return;
    if (!currentItemRef.current) setCurrentItem(target);
    setPlayerKey((value) => value + 1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (!paused) void tryPlay(videoRef.current);
    }
  }

  function clearQueue() {
    setQueue([]);
    setCurrentItem(null);
    setLastPlayedItem(null);
    setNeedsActivation(false);
    setPlayerKey((value) => value + 1);
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

  useImperativeHandle(ref, () => ({
    pause: pauseQueue,
    resume: resumeQueue,
    repeat: repeatCurrent,
  }));

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-ocean/20 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900" aria-label="Avatar Libras">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <LibrasLiveIcon size={38} decorative />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-ink dark:text-white">Avatar Libras</h2>
            <p className="text-xs font-semibold text-ink/60 dark:text-white/60">Somente vídeos, GIFs e animações aprovadas.</p>
          </div>
        </div>
        <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-ocean/10 px-3 py-1 text-xs font-black text-ocean dark:bg-mint/10 dark:text-mint" aria-live="polite">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          {paused ? "Pausado" : currentItem ? "Reproduzindo automaticamente" : "Aguardando sinal"}
        </span>
      </header>

      <div className="grid min-w-0 max-w-full gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative grid h-72 place-items-center overflow-hidden rounded-lg bg-ink text-white lg:h-[360px]">
          <div className="absolute inset-x-0 top-0 z-10 flex min-h-10 items-center justify-between bg-black/45 px-3 py-2 text-xs font-bold">
            <span aria-live="polite">{currentItem ? `Sinal atual: ${currentItem.word}` : "Sem sinal animado na fila"}</span>
            <span>{currentItem?.mediaType?.toUpperCase() ?? "FILA"}</span>
          </div>

          {currentItem?.mediaType === "video" ? (
            <video
              key={`${currentItem.key}-${playerKey}`}
              ref={videoRef}
              className="h-full w-full object-contain"
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
              aria-label={`Vídeo do sinal em Libras para ${currentItem.word}`}
            />
          ) : currentItem?.mediaType === "gif" ? (
            <img
              key={`${currentItem.key}-${playerKey}`}
              className="h-full w-full object-contain"
              src={currentItem.mediaUrl}
              alt={`Sinal em Libras para ${currentItem.word}`}
              loading="lazy"
              decoding="async"
            />
          ) : currentItem?.mediaType === "animation" ? (
            <div className="flex max-w-md flex-col items-center gap-4 px-5 py-10 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-mint text-ink shadow-soft">
                <Sparkles className="h-10 w-10" aria-hidden="true" />
              </span>
              <p className="text-base font-black">Animação do sinal {currentItem.word} recebida.</p>
              <a className="focus-ring rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean" href={currentItem.mediaUrl} target="_blank" rel="noreferrer">
                Abrir animação
              </a>
            </div>
          ) : (
            <div className="grid w-full max-w-md min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-4 py-10 text-left sm:px-6">
              <LibrasLiveWelcomeVisual variant="fallback" className="max-w-[9rem] sm:max-w-[11rem]" />
              <div className="min-w-0">
                <p className="text-lg font-black leading-relaxed">Aguardando sinal em Libras</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white/75">Ainda não há sinal em Libras para este trecho. A legenda continua ativa.</p>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-white/55">Imagem institucional; não é uma tradução em Libras.</p>
              </div>
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3">
          {needsActivation && (
            <button className="focus-ring rounded-lg bg-amber px-3 py-3 text-sm font-black text-ink" onClick={resumeQueue}>
              Toque uma vez para ativar a reprodução automática.
            </button>
          )}
          {reducedMotion && (
            <div role="status" className="rounded-lg bg-amber/25 p-3 text-sm font-bold leading-relaxed text-ink dark:text-white">
              Movimento reduzido ativo. Use Retomar para reproduzir a sequência.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Controles do Avatar Libras">
            <button className="focus-ring inline-flex min-h-12 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-black text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint" onClick={pauseQueue} aria-label="Pausar avatar">
              <Pause className="h-4 w-4" aria-hidden="true" /> Pausar
            </button>
            <button className="focus-ring inline-flex min-h-12 items-center justify-center gap-1 rounded-lg bg-ocean px-2 py-2 text-xs font-black text-white" onClick={resumeQueue} aria-label={reducedMotion && paused ? "Reproduzir sequência do avatar" : "Retomar avatar"}>
              <Play className="h-4 w-4" aria-hidden="true" /> {reducedMotion && paused ? "Reproduzir" : "Retomar"}
            </button>
            <button className="focus-ring inline-flex min-h-12 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-black text-ocean shadow-soft disabled:opacity-40 dark:bg-zinc-950 dark:text-mint" onClick={repeatCurrent} disabled={!currentItem && !lastPlayedItem} aria-label="Repetir sinal atual">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repetir
            </button>
            <button className="focus-ring inline-flex min-h-12 items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-xs font-black text-ocean shadow-soft disabled:opacity-40 dark:bg-zinc-950 dark:text-mint" onClick={clearQueue} disabled={!currentItem && !queue.length} aria-label="Limpar fila do avatar">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Limpar
            </button>
          </div>
          <button className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-black text-ocean disabled:opacity-40 dark:bg-zinc-800 dark:text-mint" onClick={advance} disabled={!currentItem} aria-label="Pular para o próximo sinal">
            <SkipForward className="h-4 w-4" aria-hidden="true" /> Pular sinal
          </button>

          <div className="rounded-lg border border-ink/10 bg-teal-50 p-3 dark:border-white/10 dark:bg-zinc-800" aria-live="polite">
            <p className="text-xs font-bold text-ink/60 dark:text-white/60">Sinal atual</p>
            <p className="mt-1 text-xl font-black text-ocean dark:text-mint">{currentItem?.word ?? "Aguardando"}</p>
            <p className="mt-2 text-xs font-semibold text-ink/65 dark:text-white/65">{upcomingWords.length ? `Na fila: ${upcomingWords.join(", ")}` : "Nenhum sinal aguardando."}</p>
            <p className="mt-2 text-xs font-semibold text-ink/55 dark:text-white/55">Reproduzidos: {playedCount}</p>
          </div>
        </aside>
      </div>

      {(currentItem || latestSupportImage) && (
        <footer className="grid gap-3 border-t border-ink/10 px-4 py-3 text-xs font-semibold leading-relaxed text-ink/70 dark:border-white/10 dark:text-white/70 sm:grid-cols-2">
          {currentItem ? (
            <div>
              <p><strong>Palavra:</strong> {currentItem.word}</p>
              {currentItem.sourceName && <p><strong>Fonte:</strong> {currentItem.sourceName}</p>}
              {currentItem.license && <p><strong>Licença:</strong> {currentItem.license}</p>}
              {referenceUrl && <a className="focus-ring mt-2 inline-flex min-h-10 items-center rounded-lg bg-teal-50 px-3 py-2 font-black text-ocean dark:bg-zinc-800 dark:text-mint" href={referenceUrl} target="_blank" rel="noreferrer">Abrir fonte</a>}
            </div>
          ) : <span />}
          {latestSupportImage && !currentItem && (
            <div role="status" className="rounded-lg bg-amber/25 p-3 text-ink dark:text-white">
              <p className="flex items-center gap-2 font-black"><ImageIcon className="h-4 w-4" aria-hidden="true" /> Imagem de apoio</p>
              <p className="mt-1">Apoio para {latestSupportImage.word}; não representa o movimento completo em Libras.</p>
            </div>
          )}
          <div className="rounded-lg bg-amber/20 p-3 text-ink/80 dark:text-white/80">
            <p className="flex items-center gap-2 font-black text-ink dark:text-white"><Info className="h-4 w-4" aria-hidden="true" /> Limite importante</p>
            <p className="mt-1">O app apoia a acessibilidade, mas não substitui intérprete humano ou revisão especializada.</p>
          </div>
        </footer>
      )}
    </section>
  );
});

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
