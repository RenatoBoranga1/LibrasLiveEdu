import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LiveTranscriptSegment } from "@/types/live";

export function TranscriptHistoryRegion({ segments }: { segments: LiveTranscriptSegment[] }) {
  const rows = segments.length ? segments : [{ originalText: "Os trechos aparecerão aqui durante a aula." }];
  return <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900"><h2 className="text-lg font-black">Histórico dos últimos trechos</h2><div className="mt-3 space-y-2">{rows.map((segment, index) => <p key={`${segment.id ?? index}-${segment.originalText}`} className="max-w-full whitespace-pre-wrap break-words rounded-lg bg-teal-50 p-3 text-base font-semibold leading-relaxed [overflow-wrap:anywhere] dark:bg-zinc-800">{segment.originalText ?? segment.text}</p>)}</div></section>;
}

export function SavedWordsRegion({ words, onClear }: { words: string[]; onClear: () => void }) {
  const visibleWords = words.length ? words : ["Nenhuma palavra salva ainda"];
  return <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">Palavras salvas neste celular</h2><Button variant="secondary" size="sm" onClick={onClear} aria-label="Limpar palavras salvas"><Trash2 className="h-4 w-4" aria-hidden="true" />Limpar palavras salvas</Button></div><div className="mt-3 flex flex-wrap gap-2">{visibleWords.map((word) => <span key={word} className="max-w-full break-words rounded-lg bg-amber/20 px-3 py-2 text-sm font-bold [overflow-wrap:anywhere]">{word}</span>)}</div></section>;
}
