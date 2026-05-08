"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Database, FileJson, RotateCcw, Search, Upload } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  importMediaManifest,
  startInesCrawler,
  startLibrasGifCrawler,
  type CrawlReport,
  type CrawlResponse,
  type InesImportJobResponse,
} from "@/services/api";

type SourceMode = "ines" | "ifpr" | "combined";

export default function MediaCrawlerPage() {
  const auth = useRequireRole(["admin"]);
  const [maxPages, setMaxPages] = useState(20);
  const [delayMs, setDelayMs] = useState(1000);
  const [dryRun, setDryRun] = useState(true);
  const [wordsText, setWordsText] = useState("aprender\nprofessor\naluno");
  const [manifestText, setManifestText] = useState("");
  const [manifestSource, setManifestSource] = useState<SourceMode>("ines");
  const [crawlerResult, setCrawlerResult] = useState<CrawlResponse | null>(null);
  const [importResult, setImportResult] = useState<InesImportJobResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"ines" | "gif" | "import" | null>(null);
  const words = useMemo(() => parseWords(wordsText), [wordsText]);

  async function runInesCrawler() {
    setLoading("ines");
    setMessage("");
    setCrawlerResult(null);
    try {
      const response = await startInesCrawler({ max_pages: maxPages, delay_ms: delayMs, dry_run: dryRun, words });
      setCrawlerResult(response);
      if (response.manifest) setManifestText(JSON.stringify(response.manifest, null, 2));
      setMessage("Crawler INES concluído. Revise o manifesto antes de importar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível rodar o crawler INES.");
    } finally {
      setLoading(null);
    }
  }

  async function runGifCrawler() {
    setLoading("gif");
    setMessage("");
    setCrawlerResult(null);
    try {
      const response = await startLibrasGifCrawler({ max_pages: maxPages, delay_ms: delayMs, dry_run: dryRun });
      setCrawlerResult(response);
      if (response.manifest) setManifestText(JSON.stringify(response.manifest, null, 2));
      setMessage("Crawler de GIFs concluído. Revise o manifesto antes de importar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível rodar o crawler de GIFs.");
    } finally {
      setLoading(null);
    }
  }

  async function runManifestImport() {
    setLoading("import");
    setImportResult(null);
    setMessage("");
    try {
      const manifest = JSON.parse(manifestText) as Record<string, unknown>;
      const response = await importMediaManifest({ source: manifestSource, manifest, approve_authorized: false, overwrite: false });
      setImportResult(response);
      setMessage("Manifesto importado como pending. A aprovação manual continua obrigatória.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível importar o manifesto.");
    } finally {
      setLoading(null);
    }
  }

  function reset() {
    setCrawlerResult(null);
    setImportResult(null);
    setManifestText("");
    setMessage("");
    setDryRun(true);
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
            <p className="text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">Catálogo controlado</p>
            <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">Catálogo automático de mídias Libras</h1>
            <p className="mt-2 text-base font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Rode crawlers autorizados em lote pequeno, gere manifestos revisáveis e importe URLs remotas como sinais pendentes de curadoria.
            </p>
          </div>
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
            Voltar para curadoria
          </Link>
        </div>

        <section className="rounded-lg border border-amber/40 bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:border-amber/30 dark:text-white" role="note">
          O crawler não roda no build, deploy, startup, seed ou migration. Ele não baixa vídeos/GIFs para o Git e não aprova sinais automaticamente. Imagens JPG/PNG continuam sendo apenas apoio visual.
        </section>

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Execução</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                Palavras para consulta INES, uma por linha
                <textarea className="focus-ring mt-2 min-h-36 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-semibold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={wordsText} onChange={(event) => setWordsText(event.target.value)} />
              </label>
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                Máximo de páginas
                <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white" type="number" min={1} max={500} value={maxPages} onChange={(event) => setMaxPages(Number(event.target.value) || 1)} />
              </label>
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                Delay entre requisições (ms)
                <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white" type="number" min={0} value={delayMs} onChange={(event) => setDelayMs(Number(event.target.value) || 0)} />
              </label>
              <label className="flex items-start gap-3 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white">
                <input className="mt-1 h-5 w-5 accent-ocean" type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
                Dry-run: retorna manifesto na tela sem salvar arquivo no servidor.
              </label>
              <div className="grid gap-2">
                <ActionButton onClick={runInesCrawler} disabled={loading !== null}>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  {loading === "ines" ? "Rodando INES..." : "Rodar crawler INES"}
                </ActionButton>
                <ActionButton tone="secondary" onClick={runGifCrawler} disabled={loading !== null}>
                  <FileJson className="h-5 w-5" aria-hidden="true" />
                  {loading === "gif" ? "Rodando GIFs..." : "Rodar crawler GIFs"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={reset} disabled={loading !== null}>
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Limpar
                </ActionButton>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-xl font-black text-ink dark:text-white">Relatório</h2>
              {message && <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white">{message}</div>}
              {crawlerResult ? <ReportCards report={crawlerResult.report} /> : <EmptyState />}
              {importResult ? <ImportSummary result={importResult} /> : null}
            </div>

            <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-ink dark:text-white">Importar manifesto</h2>
                <select className="focus-ring rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-black text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={manifestSource} onChange={(event) => setManifestSource(event.target.value as SourceMode)}>
                  <option value="ines">INES</option>
                  <option value="ifpr">IFPR</option>
                  <option value="combined">Combinado</option>
                </select>
              </div>
              <textarea className="focus-ring mt-3 min-h-72 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-mono text-xs text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={manifestText} onChange={(event) => setManifestText(event.target.value)} placeholder="{ ... manifesto JSON ... }" />
              <div className="mt-3">
                <ActionButton tone="secondary" onClick={runManifestImport} disabled={loading !== null || !manifestText.trim()}>
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  {loading === "import" ? "Importando..." : "Importar manifesto como pending"}
                </ActionButton>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ReportCards({ report }: { report: CrawlReport }) {
  const cards = [
    ["Páginas", report.pages_visited ?? 0],
    ["Entradas", report.entries_found ?? 0],
    ["Vídeos", report.videos_found ?? 0],
    ["GIFs", report.gifs_found ?? 0],
    ["Imagens de apoio", report.support_images_found ?? 0],
    ["Sem vídeo", report.entries_without_video ?? report.pages_without_gif ?? 0],
    ["Erros", report.errors_count ?? 0],
    ["Duplicados", report.duplicates_count ?? 0],
  ];
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-teal-50 p-4 dark:bg-zinc-800">
            <p className="text-xs font-black uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</p>
            <p className="mt-1 text-3xl font-black text-ink dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      {report.manifest_path ? <p className="text-sm font-bold text-ink/70 dark:text-white/70">Manifesto: {report.manifest_path}</p> : null}
    </div>
  );
}

function ImportSummary({ result }: { result: InesImportJobResponse }) {
  return (
    <div className="mt-4 rounded-lg border border-mint/50 bg-mint/20 p-4 text-sm font-bold text-ink dark:text-white">
      <Database className="mb-2 h-5 w-5" aria-hidden="true" />
      Importação concluída: {result.report.processed_items} processados, {result.report.pending_count} pendentes, {result.report.error_count} erros.
    </div>
  );
}

function EmptyState() {
  return <div className="mt-5 rounded-lg bg-teal-50 p-5 text-sm font-bold leading-relaxed text-ink/70 dark:bg-zinc-800 dark:text-white/70">Nenhum crawler executado ainda.</div>;
}

function parseWords(value: string) {
  return Array.from(new Set(value.split(/\r?\n|,/).map((word) => word.trim()).filter(Boolean)));
}
