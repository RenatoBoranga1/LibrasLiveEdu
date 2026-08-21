import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SignRecord } from "@/types/live";
import type { ReactNode } from "react";

export function SignReviewCard({ sign, selected, onSelect }: { sign: SignRecord; selected: boolean; onSelect: (sign: SignRecord) => void }) {
  const animated = Boolean(sign.avatar_video_url || sign.video_url || sign.avatar_gif_url || sign.avatar_animation_url);
  return <article className={`rounded-lg border p-4 ${selected ? "border-ocean bg-sky/45" : "border-ink/10 bg-white dark:border-white/10 dark:bg-zinc-900"}`}><div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold text-ink dark:text-white">{sign.word}</h3><p className="text-xs font-semibold text-ink/60 dark:text-white/60">{sign.source_name || "Sem fonte"}</p></div><Badge variant={sign.status === "approved" ? "approved" : "pending"}>{sign.status}</Badge></div><p className="mt-3 text-sm font-semibold text-ink/70 dark:text-white/70">{animated ? "Mídia animada para revisar" : sign.image_url ? "Somente imagem de apoio" : "Sem mídia"}</p><Button className="mt-3 w-full" variant="secondary" size="sm" onClick={() => onSelect(sign)}>{selected ? "Em revisão" : "Revisar"}</Button></article>;
}

export function ReviewQueue({ signs, selectedId, onSelect }: { signs: SignRecord[]; selectedId?: number; onSelect: (sign: SignRecord) => void }) {
  return <section aria-labelledby="review-queue-title"><h2 id="review-queue-title" className="sr-only">Fila de revisão</h2><div className="grid gap-3 sm:grid-cols-2">{signs.map((sign) => <SignReviewCard key={sign.id} sign={sign} selected={selectedId === sign.id} onSelect={onSelect} />)}</div></section>;
}

export function SignReviewDetail({ sign, children }: { sign: SignRecord; children: ReactNode }) {
  return <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900" aria-labelledby="sign-review-detail-title"><header className="mb-4"><p className="text-xs font-extrabold text-ocean dark:text-mint">Revisão individual</p><h2 id="sign-review-detail-title" className="text-xl font-extrabold text-ink dark:text-white">{sign.word}</h2></header>{children}</section>;
}
