"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, Search, Wand2 } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  diagnoseInesStandardVideo,
  fillPendingInesStandardVideo,
  fillSelectedInesStandardVideo,
  type InesStandardVideoReport,
  type InesStandardVideoReportItem,
  type InesStandardVideoResponse,
} from "@/services/api";

export default function InesStandardVideoPage() {
  const auth = useRequireRole(["admin"]);
  const [wordsText, setWordsText] = useState("abacate\nabafar\nabaixo");
  const [maxItems, setMaxItems] = useState(20);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<InesStandardVideoResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"diagnose" | "selected" | "pending" | null>(null);

  const words = useMemo(() => parseWords(wordsText), [wordsText]);

  async function runDiagnose() {
    setLoading("diagnose");
    setResult(null);
    try {
      const response = await diagnoseInesStandardVideo({ words, max_items: maxItems });
      setResult(response);
      setMessage("Diagnóstico concluído. Nenhum dado foi alterado no banco.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível diagnosticar as URLs padrão INES.");
    } finally {
      setLoading(null);
    }
  }

  async function runSelected() {
    setLoading("selected");
    setResult(null);
    try {
      const response = await fillSelectedInesStandardVideo({ words, max_items: maxItems, overwrite });
      setResult(response);
      setMessage("Preenchimento concluído. Sinais válidos continuam pendentes para curadoria.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível preencher as palavras selecionadas.");
    } finally {
      setLoading(null);
    }
  }

  async function runPending() {
    setLoading("pending");
    setResult(null);
    try {
      const response = await fillPendingInesStandardVideo({ max_items: maxItems, overwrite });
      setResult(response);
      setMessage("Próximas pendentes processadas. Aprove manualmente antes de usar no Avatar Libras.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível preencher as próximas pendentes.");
    } finally {
      setLoading(null);
    }
  }

  function reset() {
    setWordsText("abacate\nabafar\nabaixo");
    setMaxItems(20);
    setOverwrite(false);
    setResult(null);
    setMessage("");
  }

  if (auth.loading) {
    return (
      <main className="min-h-screen bg-paper dark:bg-zinc-950">
        <AppHeader />
        <div role="status" className="mx-auto max-w-lg px-4 py-10 text-lg font-black text-ink dark:text-white">
          Verificando permissão...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">Rotina administrativa sob demanda</p>
            <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">Preenchimento por padrão de vídeo INES</h1>
            <p className="mt-2 text-base font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Gera URLs no padrão {"{palavraNormalizada}"}Sm_Prog001.mp4, testa se o vídeo realmente existe e só salva URLs válidas.
            </p>
          </div>
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
            Voltar para curadoria
          </Link>
        </div>

        <section className="rounded-lg border border-amber/40 bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:border-amber/30 dark:text-white" role="note">
          Esta rotina não roda no build/deploy/startup, não baixa vídeos e não aprova sinais. URLs quebradas ou imagens estáticas não serão salvas como Avatar Libras.
        </section>

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Configuração</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                Palavras, uma por linha
                <textarea
                  className="focus-ring mt-2 min-h-52 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-semibold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={wordsText}
                  onChange={(event) => setWordsText(event.target.value)}
                />
              </label>

              <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                Máximo de itens
                <input
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  type="number"
                  min={1}
                  max={50}
                  value={maxItems}
                  onChange={(event) => setMaxItems(Number(event.target.value) || 1)}
                />
              </label>

              <label className="focus-within:ring-2 focus-within:ring-ocean/60 flex items-start gap-3 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white">
                <input
                  className="mt-1 h-5 w-5 accent-ocean"
                  type="checkbox"
                  checked={overwrite}
                  onChange={(event) => setOverwrite(event.target.checked)}
                />
                Sobrescrever vídeo existente. Desativado por padrão.
              </label>

              <div className="grid gap-2">
                <ActionButton onClick={runDiagnose} disabled={loading !== null || words.length === 0}>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  {loading === "diagnose" ? "Diagnosticando..." : "Diagnosticar palavras"}
                </ActionButton>
                <ActionButton tone="secondary" onClick={runSelected} disabled={loading !== null || words.length === 0}>
                  <Wand2 className="h-5 w-5" aria-hidden="true" />
                  {loading === "selected" ? "Preenchendo..." : "Preencher palavras selecionadas"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={runPending} disabled={loading !== null}>
                  <Wand2 className="h-5 w-5" aria-hidden="true" />
                  {loading === "pending" ? "Preenchendo..." : "Preencher próximas pendentes sem vídeo"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={reset} disabled={loading !== null}>
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Limpar
                </ActionButton>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Relatório</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              O sistema só salva `video_url` quando a URL gerada passa na validação remota. Tudo permanece `pending`.
            </p>
            {message ? <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white">{message}</div> : null}
            {result ? <ReportPanel report={result.report} /> : <p className="mt-6 text-sm font-bold text-ink/60 dark:text-white/60">Execute um diagnóstico ou preenchimento para ver os resultados.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function ReportPanel({ report }: { report: InesStandardVideoReport }) {
  const cards = [
    ["Total", report.total_items],
    ["Processados", report.processed_items],
    ["Válidos", report.valid_videos],
    ["Inválidos", report.invalid_videos],
    ["Atualizados", report.updated_count],
    ["Ignorados", report.skipped_count],
  ];
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-teal-50 p-4 dark:bg-zinc-800">
            <p className="text-xs font-black uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</p>
            <p className="mt-1 text-3xl font-black text-ink dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="uppercase tracking-normal text-ink/60 dark:text-white/60">
            <tr>
              <th className="px-3 py-2">Palavra</th>
              <th className="px-3 py-2">Normalizada</th>
              <th className="px-3 py-2">URL gerada</th>
              <th className="px-3 py-2">Validada</th>
              <th className="px-3 py-2">HTTP</th>
              <th className="px-3 py-2">Avatar</th>
              <th className="px-3 py-2">Motivo</th>
              <th className="px-3 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {report.items.map((item) => (
              <ReportRow key={`${item.word}-${item.generated_url}`} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportRow({ item }: { item: InesStandardVideoReportItem }) {
  const previewUrl = item.validation_final_url || item.video_url || item.generated_url;
  return (
    <tr className="bg-teal-50 font-semibold text-ink dark:bg-zinc-800 dark:text-white">
      <td className="rounded-l-lg px-3 py-3 text-base font-black">{item.word}</td>
      <td className="px-3 py-3">{item.normalized_word || "-"}</td>
      <td className="max-w-80 px-3 py-3">
        <a className="break-all text-ocean underline-offset-4 hover:underline dark:text-mint" href={item.generated_url} target="_blank" rel="noreferrer">
          {item.generated_url}
        </a>
        {item.validated ? (
          <video className="mt-2 h-24 w-36 rounded bg-black object-contain" src={previewUrl} controls muted playsInline preload="metadata" controlsList="nodownload" />
        ) : (
          <p className="mt-2 rounded-lg bg-red-100 px-2 py-1 text-xs font-black text-red-950">URL não será salva como Avatar Libras.</p>
        )}
      </td>
      <td className="px-3 py-3">{item.validated ? "Sim" : "Não"}</td>
      <td className="px-3 py-3">
        <div>{item.http_status ?? "-"}</div>
        {item.content_type ? <p className="mt-1 text-xs text-ink/60 dark:text-white/60">{item.content_type}</p> : null}
      </td>
      <td className="px-3 py-3">{item.can_use_avatar ? "Sim" : "Não"}</td>
      <td className="px-3 py-3">{item.reason || item.validation_reason || "-"}</td>
      <td className="rounded-r-lg px-3 py-3">{item.recommended_action || "Revisar"}</td>
    </tr>
  );
}

function parseWords(value: string) {
  return value
    .split(/\r?\n/)
    .map((word) => word.trim())
    .filter(Boolean);
}
