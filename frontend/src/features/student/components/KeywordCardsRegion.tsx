import { BookmarkPlus, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getStudentCardMedia } from "@/features/student/studentMedia";
import type { SignCard } from "@/types/live";

export function KeywordCardsRegion({ cards, onSaveWord, onOpenMedia }: { cards: SignCard[]; onSaveWord: (card?: SignCard) => void; onOpenMedia: (card: SignCard) => void }) {
  const visibleCards: SignCard[] = cards.length ? cards : [{ word: "tecnologia", status: "pending", sourceName: "Seed educacional inicial" }];
  return <section aria-label="Cards visuais de palavras-chave" className="space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">Palavras-chave</h2><Button variant="secondary" size="sm" onClick={() => onSaveWord(cards[0])} aria-label="Salvar primeira palavra-chave"><BookmarkPlus className="h-4 w-4" aria-hidden="true" />Salvar</Button></div>
    <div className="-mx-4 overflow-x-auto px-4 pb-2"><div className="flex min-w-full gap-3">{visibleCards.map((card) => {
      const approved = card.status === "approved";
      const unavailable = card.status === "unavailable" || card.status === "missing";
      const media = approved ? getStudentCardMedia(card) : null;
      const statusLabel = approved ? "Sinal aprovado" : unavailable ? "Sinal ainda não cadastrado" : "Aguardando curadoria";
      const mediaLabel = media?.type === "video" ? "Com vídeo" : media?.type === "gif" ? "Com GIF" : media?.type === "image" ? "Com imagem de apoio" : "Sem mídia";
      return <article key={`${card.word}-${card.id ?? card.status}`} className="w-72 shrink-0 rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 break-words text-xl font-black [overflow-wrap:anywhere]">{card.word}</h3><div className="flex flex-col items-end gap-1"><span className={`rounded-full px-2 py-1 text-xs font-black ${approved ? "bg-ocean text-white" : unavailable ? "bg-zinc-200 text-ink" : "bg-amber/20 text-ink dark:text-white"}`}>{statusLabel}</span><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black ${media ? "bg-mint text-ink" : "bg-zinc-200 text-ink"}`}>{media?.type === "video" ? <Video className="h-3.5 w-3.5" aria-hidden="true" /> : media ? <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> : null}{mediaLabel}</span></div></div>
        {media?.type === "gif" ? <img className="mt-3 h-28 w-full rounded-lg bg-ink object-contain" src={media.url} alt={`Preview do GIF do sinal ${card.word}`} loading="lazy" decoding="async" /> : null}
        <div className="mt-3 space-y-1 text-xs font-bold leading-relaxed text-ink/65 dark:text-white/65">{approved && card.gloss ? <p>Glosa: {card.gloss}</p> : null}{card.sourceName ? <p>Fonte: {card.sourceName}</p> : null}{card.license ? <p>Licença: {card.license}</p> : null}{card.licenseNotes ? <p>Autorização: {card.licenseNotes}</p> : null}{card.sourceReferenceUrl ? <p>Referência cadastrada.</p> : null}{!approved && !unavailable ? <p>Este sinal ainda está pendente de curadoria por especialista em Libras.</p> : null}</div>
        <div className="mt-4 grid gap-2">{media ? <Button size="sm" onClick={() => onOpenMedia(card)}>{media.type === "image" ? "Ver apoio visual" : "Ver sinal"}</Button> : null}<Button variant="secondary" size="sm" className="w-full" onClick={() => onSaveWord(card)}>Salvar palavra</Button></div>
      </article>;
    })}</div></div>
  </section>;
}
