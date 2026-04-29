import { BookmarkPlus, CheckCircle2, Clock3 } from "lucide-react";
import type { SignCard } from "@/types/live";
import { ActionButton } from "./ActionButton";

export function KeywordCards({ cards, onSave }: { cards: SignCard[]; onSave?: (word: string) => void }) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink/20 bg-white p-5 text-center text-sm font-semibold text-ink/60 dark:border-white/20 dark:bg-zinc-900 dark:text-white/60">
        Os cards de palavras-chave aparecerão aqui durante a aula.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={`${card.word}-${card.id ?? card.status}`} className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-ink dark:text-white">{card.word}</h3>
              <p className="mt-1 text-sm text-ink/65 dark:text-white/65">
                {card.status === "missing" ? "Sinal ainda não cadastrado" : card.sourceName ?? "Seed educacional inicial"}
              </p>
            </div>
            {card.status === "approved" ? (
              <CheckCircle2 className="h-5 w-5 text-ocean" aria-label="Aprovado" />
            ) : (
              <Clock3 className="h-5 w-5 text-amber" aria-label="Pendente" />
            )}
          </div>
          <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-semibold text-ink dark:bg-zinc-800 dark:text-white">
            {card.gloss ? `Glosa: ${card.gloss}` : "Pendente de curadoria por especialista em Libras."}
          </div>
          {onSave && (
            <ActionButton tone="quiet" className="mt-4 w-full text-sm" onClick={() => onSave(card.word)}>
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
              Salvar palavra
            </ActionButton>
          )}
        </article>
      ))}
    </div>
  );
}
