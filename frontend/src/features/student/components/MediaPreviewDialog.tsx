import { Dialog } from "@/components/ui/Dialog";
import { getStudentCardMedia } from "@/features/student/studentMedia";
import type { SignCard } from "@/types/live";

export function MediaPreviewDialog({ card, onClose }: { card: SignCard | null; onClose: () => void }) {
  const media = getStudentCardMedia(card);
  return <Dialog open={Boolean(card && media)} title={card?.word ?? "Mídia do sinal"} description={media?.type === "image" ? "Apoio visual. Esta imagem não representa o movimento completo em Libras." : "Sinal em Libras com fonte e autorização registradas."} onClose={onClose}>
    {card && media ? <>{media.type === "video" ? <video className="max-h-[52vh] w-full rounded-lg bg-ink object-contain" src={media.url} controls controlsList="nodownload" playsInline preload="metadata" aria-label={`Vídeo do sinal ${card.word} em Libras`} /> : <img className="max-h-[52vh] w-full rounded-lg bg-ink object-contain" src={media.url} alt={`${media.type === "gif" ? "GIF" : "Imagem de apoio"} do sinal ${card.word}`} loading="lazy" decoding="async" />}<div className="mt-4 space-y-2 rounded-lg bg-teal-50 p-3 text-sm font-bold leading-relaxed text-ink/75 dark:bg-zinc-800 dark:text-white/75">{card.gloss ? <p>Glosa: {card.gloss}</p> : null}{card.sourceName ? <p>Fonte: {card.sourceName}</p> : null}{card.license ? <p>Licença/autorização: {card.license}</p> : null}{card.licenseNotes ? <p>Observação: {card.licenseNotes}</p> : null}{card.sourceReferenceUrl || card.sourceUrl ? <a className="focus-ring touch-target inline-flex items-center rounded-lg bg-white px-3 py-2 text-ocean dark:bg-zinc-950 dark:text-mint" href={card.sourceReferenceUrl || card.sourceUrl || "#"} target="_blank" rel="noreferrer">Abrir fonte cadastrada</a> : null}</div></> : null}
  </Dialog>;
}
