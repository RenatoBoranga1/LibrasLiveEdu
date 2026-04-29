"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, History, Home } from "lucide-react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { KeywordCards } from "@/components/KeywordCards";
import { ModeBadge } from "@/components/ModeBadge";
import { API_BASE, getReviewByAccessCode } from "@/services/api";
import type { ClassReview } from "@/types/live";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const fallbackReview: ClassReview = {
  classSession: {
    id: 1,
    title: "Aula demo",
    subject_id: null,
    access_code: "AULA-4821",
    status: "active",
  },
  transcript: [
    { id: 1, text: "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação." },
    { id: 2, text: "Um sistema usa entrada, processamento e saída para resolver problemas." },
    { id: 3, text: "Na matemática, a soma e a divisão ajudam a comparar números." },
  ],
  keywords: ["tecnologia", "dados", "sistema", "matemática"],
  cards: [
    { word: "tecnologia", status: "pending", sourceName: "Seed educacional inicial" },
    { word: "dados", status: "pending", sourceName: "Seed educacional inicial" },
    { word: "sistema", status: "pending", sourceName: "Seed educacional inicial" },
  ],
};

export default function ReviewByCodePage() {
  const params = useParams<{ accessCode: string }>();
  const accessCode = decodeURIComponent(params.accessCode ?? (demoMode ? "AULA-4821" : "")).toUpperCase();
  const [review, setReview] = useState<ClassReview | null>(demoMode ? fallbackReview : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    getReviewByAccessCode(accessCode).then(setReview).catch(() => {
      if (demoMode) {
        setReview({
          ...fallbackReview,
          classSession: { ...fallbackReview.classSession, access_code: accessCode },
        });
        return;
      }
      setReview(null);
      setError("Não foi possível carregar a revisão desta aula. Confira o código ou tente novamente quando a conexão voltar.");
    });
  }, [accessCode]);

  if (!review) {
    return (
      <main className="min-h-screen bg-paper dark:bg-zinc-950">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <ModeBadge label={accessCode ? `sala ${accessCode}` : "revisão da aula"} />
          <section className="mt-4 rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h1 className="text-3xl font-black text-ink dark:text-white">Revisão da aula</h1>
            <p role="alert" className="mt-3 text-base font-semibold leading-relaxed text-ink/75 dark:text-white/75">
              {error ?? "Carregando revisão da aula..."}
            </p>
            <Link
              href="/aluno"
              className="focus-ring mt-5 inline-flex min-h-12 items-center justify-center rounded-lg bg-ocean px-4 py-3 font-bold text-white"
            >
              Voltar para digitar outro código
            </Link>
          </section>
          <div className="mt-4">
            <InstitutionalNotice />
          </div>
        </div>
      </main>
    );
  }

  const summaryLabel = demoMode ? "Resumo demo" : "Resumo automático";
  const summary = `${summaryLabel}: a aula "${review.classSession.title}" reuniu os principais termos ${review.keywords.slice(0, 5).join(", ")}. Revise os cards e confirme sinais pendentes com especialista em Libras.`;

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <ModeBadge label={`sala ${accessCode}`} />
              <h1 className="mt-3 text-3xl font-black text-ink dark:text-white">Revisão da aula</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`${API_BASE}/api/classes/${review.classSession.id}/export.pdf`}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ocean px-4 py-3 font-bold text-white"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                Exportar
              </a>
              <Link
                href={`/join/${accessCode}`}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-3 font-bold text-ink dark:border-white/10 dark:bg-zinc-900 dark:text-white"
              >
                <History className="h-5 w-5" aria-hidden="true" />
                Aula
              </Link>
            </div>
          </div>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Resumo automático</h2>
            <p className="mt-3 text-lg font-semibold leading-relaxed text-ink/80 dark:text-white/80">{summary}</p>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Transcrição completa</h2>
            <div className="mt-4 space-y-3">
              {review.transcript.map((line) => (
                <p key={line.id} className="rounded-lg bg-teal-50 p-3 text-base font-semibold text-ink dark:bg-zinc-800 dark:text-white">
                  {line.text}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-black text-ink dark:text-white">Cards de sinais</h2>
            <KeywordCards cards={review.cards} />
          </section>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Palavras-chave</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {review.keywords.map((word) => (
                <span key={word} className="rounded-full bg-amber/20 px-3 py-2 text-sm font-bold text-ink dark:text-white">
                  {word}
                </span>
              ))}
            </div>
          </section>
          <InstitutionalNotice />
          <Link href="/" className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-bold text-ink shadow-soft dark:bg-zinc-900 dark:text-white">
            <Home className="h-5 w-5" aria-hidden="true" />
            Início
          </Link>
        </aside>
      </div>
    </main>
  );
}
