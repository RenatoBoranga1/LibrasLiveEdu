"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronDown, RotateCcw } from "lucide-react";
import { ConnectionStatusBanner } from "@/components/ConnectionStatusBanner";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { LiveModeSelector } from "@/components/LiveModeSelector";
import { CAPTION_SIZES } from "@/lib/studentPreferences";
import type { SignCard } from "@/types/live";
import { useStudentPreferences } from "@/features/student/hooks/useStudentPreferences";
import { useSavedWords } from "@/features/student/hooks/useSavedWords";
import { useStudentClassroom } from "@/features/student/hooks/useStudentClassroom";
import { useCaptionControls } from "@/features/student/hooks/useCaptionControls";
import { useMediaPreview } from "@/features/student/hooks/useMediaPreview";
import { useAvatarControls } from "@/features/student/hooks/useAvatarControls";
import { StudentClassroomHeader } from "@/features/student/components/StudentClassroomHeader";
import { KeywordCardsRegion } from "@/features/student/components/KeywordCardsRegion";
import { SavedWordsRegion, TranscriptHistoryRegion } from "@/features/student/components/ClassroomReviewRegions";
import { MediaPreviewDialog } from "@/features/student/components/MediaPreviewDialog";
import { AvatarRegion, LiveCaptionRegion, LiveSummaryRegion } from "@/features/student/components/ClassroomRegions";
import { StudentAccessibilityToolbar } from "@/features/student/components/StudentAccessibilityToolbar";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function StudentClassroomPage({ accessCode }: { accessCode: string }) {
  const { live, classSession, initialSummary, loading, notice, classEnded } = useStudentClassroom(accessCode);
  const preferences = useStudentPreferences();
  const { highContrast, captionSizeIndex, summaryTextScale, viewMode, setHighContrast, setSummaryTextScale, setViewMode, changeCaptionSize, toggleFocusMode } = preferences;
  const { savedWords, notice: savedWordsNotice, saveWord: saveSavedWord, clearSavedWords } = useSavedWords(accessCode);
  const captions = useCaptionControls({ currentCaption: live.currentCaption, connected: live.connected, reconnecting: live.reconnecting, classEnded });
  const preview = useMediaPreview();
  const avatar = useAvatarControls();
  const cards = useMemo(() => live.cards.slice(0, 10), [live.cards]);
  const showAvatar = viewMode === "full" || viewMode === "focus";
  const showCaption = viewMode === "full" || viewMode === "focus" || viewMode === "caption";
  const showCards = viewMode === "full" || viewMode === "cards";
  const visibleSummary = live.liveSummary ?? initialSummary;
  const connectionLabel = classEnded ? "Aula encerrada" : live.connected ? "Conectado" : live.reconnecting ? "Tentando reconectar" : "Aguardando professor";
  const focusMode = viewMode === "focus";
  const handleSaveWord = (card?: SignCard) => saveSavedWord(card ?? cards[0]);

  return <main className={`student-classroom min-h-screen w-full max-w-full overflow-x-clip bg-paper pb-40 text-ink dark:bg-zinc-950 dark:text-white lg:pb-32 ${highContrast ? "high-contrast" : ""}`}>
    <StudentClassroomHeader title={classSession?.title} loading={loading} connected={live.connected} connectionLabel={connectionLabel} />
    <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <ConnectionStatusBanner connected={live.connected} reconnecting={live.reconnecting} error={live.connectionError} label={connectionLabel} />
      {notice || savedWordsNotice ? <div role="status" className="rounded-lg bg-ocean px-4 py-3 text-sm font-bold text-white">{savedWordsNotice || notice}</div> : null}
      {(classEnded || !classSession) && !loading ? <Link className="focus-ring touch-target inline-flex items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/aluno">Voltar para entrar com outro código</Link> : null}
      {demoMode && !focusMode ? <button className="focus-ring touch-target inline-flex items-center justify-center gap-2 justify-self-start rounded-lg bg-amber px-4 py-2 text-sm font-black text-ink" onClick={live.injectDemo} aria-label="Testar acessibilidade com trecho local de demonstração"><RotateCcw className="h-5 w-5" aria-hidden="true" />Testar acessibilidade</button> : null}
      {showCaption ? <LiveCaptionRegion text={captions.text} size={CAPTION_SIZES[captionSizeIndex]} status={captions.status} paused={captions.paused} onTogglePause={captions.togglePause} /> : null}
      {showAvatar || showCaption ? <div className={`grid min-w-0 max-w-full items-start gap-4 ${showAvatar && showCaption && !focusMode ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]" : ""}`}>{showAvatar ? <AvatarRegion items={live.avatarItems} playerRef={avatar.playerRef} onPlaybackStateChange={avatar.setPaused} /> : null}{showCaption ? <LiveSummaryRegion summary={visibleSummary} textScale={summaryTextScale} onIncreaseText={() => setSummaryTextScale((value) => Math.min(2, value + 1) as 0 | 1 | 2)} onDecreaseText={() => setSummaryTextScale((value) => Math.max(0, value - 1) as 0 | 1 | 2)} /> : null}</div> : null}
      {!focusMode ? <details className="rounded-lg border border-ink/10 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-zinc-900"><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-sm font-black text-ocean dark:text-mint">Opções de visualização<ChevronDown className="h-5 w-5" aria-hidden="true" /></summary><div className="mt-3 max-w-xl"><LiveModeSelector value={viewMode} onChange={setViewMode} /></div></details> : null}
      {showCards && !focusMode ? <KeywordCardsRegion cards={cards} onSaveWord={(card) => void handleSaveWord(card)} onOpenMedia={preview.openPreview} /> : null}
      {!focusMode ? <><TranscriptHistoryRegion segments={live.segments} /><SavedWordsRegion words={savedWords} onClear={clearSavedWords} /><InstallPWAButton /></> : null}
    </div>
    <MediaPreviewDialog card={preview.previewCard} onClose={preview.closePreview} />
    <StudentAccessibilityToolbar highContrast={highContrast} focusMode={focusMode} avatarPaused={avatar.paused} canSaveWord={cards.length > 0} reviewHref={`/review/${accessCode}`} canDecreaseText={captionSizeIndex > 0} canIncreaseText={captionSizeIndex < CAPTION_SIZES.length - 1} onDecreaseText={() => changeCaptionSize(-1)} onIncreaseText={() => changeCaptionSize(1)} onToggleContrast={() => setHighContrast((value) => !value)} onToggleFocus={toggleFocusMode} onToggleAvatar={avatar.toggle} onRepeatSignal={avatar.repeat} onSaveWord={() => handleSaveWord()} />
  </main>;
}
