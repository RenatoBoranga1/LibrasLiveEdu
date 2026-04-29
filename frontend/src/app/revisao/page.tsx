import Link from "next/link";
import { Download, ListChecks } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { KeywordCards } from "@/components/KeywordCards";
import { ModeBadge } from "@/components/ModeBadge";
import type { SignCard } from "@/types/live";

const transcript = [
  "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação.",
  "Um sistema usa entrada, processamento e saída para resolver problemas.",
  "Na matemática, a soma e a divisão ajudam a comparar números.",
  "Em ciências, energia, água, planta e animal são palavras importantes."
];

const cards: SignCard[] = [
  { word: "tecnologia", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
  { word: "dados", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
  { word: "energia", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
  { word: "matemática", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" }
];

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <ModeBadge />
              <h1 className="mt-3 text-3xl font-black text-ink dark:text-white">Revisão da aula</h1>
            </div>
            <Link
              href="/professor"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ocean px-4 py-3 font-bold text-white"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              Exportar conteúdo
            </Link>
          </div>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-normal text-ocean dark:text-mint">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
              Resumo automático
            </div>
            <p className="mt-3 text-lg font-semibold leading-relaxed text-ink/80 dark:text-white/80">
              Resumo demo: a aula apresentou tecnologia, dados e sistemas, relacionando o tema com operações de
              matemática e conceitos básicos de ciências. Revise os termos pendentes com apoio de um especialista em
              Libras antes de tratar qualquer sinal como oficial.
            </p>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Transcrição completa</h2>
            <div className="mt-4 space-y-3">
              {transcript.map((line) => (
                <p key={line} className="rounded-lg bg-teal-50 p-3 text-base font-semibold text-ink dark:bg-zinc-800 dark:text-white">
                  {line}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-black text-ink dark:text-white">Cards de sinais</h2>
            <KeywordCards cards={cards} />
          </section>
        </section>
        <aside className="space-y-4">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Palavras-chave</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {cards.map((card) => (
                <span key={card.word} className="rounded-full bg-amber/20 px-3 py-2 text-sm font-bold text-ink dark:text-white">
                  {card.word}
                </span>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Palavras salvas</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {["tecnologia", "sistema"].map((word) => (
                <span key={word} className="rounded-full bg-ocean/10 px-3 py-2 text-sm font-bold text-ocean dark:bg-mint/10 dark:text-mint">
                  {word}
                </span>
              ))}
            </div>
          </section>
          <InstitutionalNotice />
        </aside>
      </div>
    </main>
  );
}
