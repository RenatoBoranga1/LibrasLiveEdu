"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Database, FileCheck2, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { LibrasLiveRealisticVisual } from "@/components/brand/LibrasLiveRealisticVisual";
import { PageHero } from "@/components/ui/ProductUI";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  importInesCatalog,
  scanInesCatalog,
  validateInesCatalogManifest,
  type InesCatalogReport,
  type InesCatalogReportItem,
  type InesCatalogResponse,
} from "@/services/api";

const DEFAULT_LETTERS = "A B C";
const DEFAULT_MANIFEST_PATH = "backend/app/importers/manifests/ines_full_catalog.generated.json";

export default function InesCatalogPage() {
  const auth = useRequireRole(["admin"]);
  const [lettersText, setLettersText] = useState(DEFAULT_LETTERS);
  const [maxItems, setMaxItems] = useState(100);
  const [delayMs, setDelayMs] = useState(1000);
  const [dryRun, setDryRun] = useState(true);
  const [overwriteManifest, setOverwriteManifest] = useState(false);
  const [overwriteSigns, setOverwriteSigns] = useState(false);
  const [manifestPath, setManifestPath] = useState(DEFAULT_MANIFEST_PATH);
  const [manifestText, setManifestText] = useState("");
  const [result, setResult] = useState<InesCatalogResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"scan" | "validate" | "import" | null>(null);
  const letters = useMemo(() => parseLetters(lettersText), [lettersText]);

  async function runScan() {
    setLoading("scan");
    setMessage("");
    setResult(null);
    try {
      const response = await scanInesCatalog({
        letters,
        max_items: maxItems,
        delay_ms: delayMs,
        dry_run: dryRun,
        overwrite_manifest: overwriteManifest,
        use_browser: false,
      });
      setResult(response);
      if (response.manifest) {
        setManifestText(JSON.stringify(response.manifest, null, 2));
      }
      if (response.report.manifest_path) {
        setManifestPath(response.report.manifest_path);
      }
      setMessage(
        dryRun
          ? "Scan concluído em dry-run. Revise o manifesto na tela antes de importar."
          : "Scan concluído e manifesto salvo. Valide o manifesto antes de importar para curadoria."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível escanear o catálogo INES.");
    } finally {
      setLoading(null);
    }
  }

  async function runValidation() {
    setLoading("validate");
    setMessage("");
    try {
      const manifest = manifestText.trim() ? (JSON.parse(manifestText) as Record<string, unknown>) : undefined;
      const response = await validateInesCatalogManifest({ manifest, manifest_path: manifest ? undefined : manifestPath, max_items: maxItems });
      setResult(response);
      setMessage("Manifesto validado. URLs inválidas não devem ser importadas como Avatar Libras.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível validar o manifesto.");
    } finally {
      setLoading(null);
    }
  }

  async function runImport() {
    setLoading("import");
    setMessage("");
    try {
      const manifest = manifestText.trim() ? (JSON.parse(manifestText) as Record<string, unknown>) : undefined;
      const response = await importInesCatalog({
        manifest,
        manifest_path: manifest ? undefined : manifestPath,
        max_items: maxItems,
        overwrite: overwriteSigns,
        status: "pending",
      });
      setResult(response);
      setMessage("Catálogo importado como pendente de revisão. O Avatar só exibirá mídia após aprovação em /admin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível importar o catálogo para curadoria.");
    } finally {
      setLoading(null);
    }
  }

  function reset() {
    setResult(null);
    setMessage("");
    setManifestText("");
    setLettersText(DEFAULT_LETTERS);
    setDryRun(true);
    setOverwriteManifest(false);
    setOverwriteSigns(false);
    setManifestPath(DEFAULT_MANIFEST_PATH);
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
      <PageHero
        eyebrow="Importação controlada"
        title="Catálogo completo INES"
        description="Escaneie letras do Dicionário INES, valide vídeos e imagens, gere um manifesto revisável e importe palavras como pendentes para curadoria humana."
        actions={
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
            Voltar para curadoria
          </Link>
        }
        visual={<LibrasLiveRealisticVisual variant="curation" decorative className="h-56 w-full" />}
      />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <section className="rounded-lg border border-amber/40 bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:border-amber/30 dark:text-white" role="note">
          A rotina não roda em build, deploy, startup, seed ou migration. Ela não baixa mídia, não salva vídeos/GIFs no Git e não aprova sinais automaticamente. JPG/PNG entram apenas como imagem de apoio; Avatar Libras exige vídeo, GIF ou animação aprovada.
        </section>

        <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-ocean dark:text-mint" aria-hidden="true" />
              <h2 className="text-xl font-black text-ink dark:text-white">Controle do catálogo</h2>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="letters">
                Letras para escanear
                <textarea
                  id="letters"
                  className="focus-ring mt-2 min-h-24 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-semibold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={lettersText}
                  onChange={(event) => setLettersText(event.target.value)}
                  placeholder="A B C ou A,B,C"
                />
              </label>
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="max-items">
                Máximo de páginas/itens por execução
                <input
                  id="max-items"
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  type="number"
                  min={1}
                  max={500}
                  value={maxItems}
                  onChange={(event) => setMaxItems(Number(event.target.value) || 1)}
                />
              </label>
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="delay-ms">
                Delay entre requisições (ms)
                <input
                  id="delay-ms"
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  type="number"
                  min={0}
                  value={delayMs}
                  onChange={(event) => setDelayMs(Number(event.target.value) || 0)}
                />
              </label>
              <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="manifest-path">
                Caminho do manifesto salvo
                <input
                  id="manifest-path"
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={manifestPath}
                  onChange={(event) => setManifestPath(event.target.value)}
                />
              </label>
              <label className="flex items-start gap-3 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white">
                <input className="mt-1 h-5 w-5 accent-ocean" type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
                Dry-run: mostra o manifesto na tela sem salvar arquivo no servidor.
              </label>
              <label className="flex items-start gap-3 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white">
                <input className="mt-1 h-5 w-5 accent-ocean" type="checkbox" checked={overwriteManifest} onChange={(event) => setOverwriteManifest(event.target.checked)} />
                Sobrescrever manifesto gerado, quando o dry-run estiver desligado.
              </label>
              <label className="flex items-start gap-3 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white">
                <input className="mt-1 h-5 w-5 accent-ocean" type="checkbox" checked={overwriteSigns} onChange={(event) => setOverwriteSigns(event.target.checked)} />
                Sobrescrever campos existentes dos sinais durante a importação.
              </label>
              <div className="grid gap-2">
                <ActionButton onClick={runScan} disabled={loading !== null} aria-label="Escanear catálogo INES">
                  <Search className="h-5 w-5" aria-hidden="true" />
                  {loading === "scan" ? "Escaneando..." : "Escanear catálogo"}
                </ActionButton>
                <ActionButton tone="secondary" onClick={runValidation} disabled={loading !== null || (!manifestText.trim() && !manifestPath.trim())} aria-label="Validar manifesto INES">
                  <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                  {loading === "validate" ? "Validando..." : "Validar manifesto"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={runImport} disabled={loading !== null || (!manifestText.trim() && !manifestPath.trim())} aria-label="Importar catálogo INES para curadoria">
                  <Database className="h-5 w-5" aria-hidden="true" />
                  {loading === "import" ? "Importando..." : "Importar para curadoria"}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-ink dark:text-white">Relatório</h2>
                {result?.job_id ? <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-ink">Job #{result.job_id}</span> : null}
              </div>
              {message ? (
                <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white" role="status">
                  {message}
                </div>
              ) : null}
              {result ? <CatalogReport report={result.report} /> : <EmptyState />}
            </div>

            <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-xl font-black text-ink dark:text-white">Manifesto revisável</h2>
              <p className="mt-1 text-sm font-bold leading-relaxed text-ink/70 dark:text-white/70">
                Cole um manifesto JSON validado ou use o dry-run para preencher automaticamente. A importação manterá todos os sinais como pendentes.
              </p>
              <textarea
                aria-label="Manifesto JSON do catálogo INES"
                className="focus-ring mt-3 min-h-72 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-mono text-xs text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                value={manifestText}
                onChange={(event) => setManifestText(event.target.value)}
                placeholder="{ ... ines_full_catalog.generated.json ... }"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CatalogReport({ report }: { report: InesCatalogReport }) {
  const entriesFound = report.entries_found ?? report.total_items ?? 0;
  const videos = report.videos_found ?? report.video_found_count ?? 0;
  const images = report.images_found ?? report.image_found_count ?? 0;
  const withoutVideo = report.without_video ?? report.video_missing_count ?? 0;
  const errors = report.errors_count ?? report.error_count ?? 0;
  const cards = [
    ["Palavras encontradas", entriesFound],
    ["Vídeos válidos", videos],
    ["Imagens válidas", images],
    ["Sem vídeo", withoutVideo],
    ["Importadas", report.imported_count ?? report.created_count ?? 0],
    ["Ignoradas", report.skipped_count ?? 0],
    ["Erros", errors],
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
      {report.manifest_path ? <p className="break-all text-sm font-bold text-ink/70 dark:text-white/70">Manifesto: {report.manifest_path}</p> : null}
      <CatalogTable items={report.items ?? []} />
    </div>
  );
}

function CatalogTable({ items }: { items: InesCatalogReportItem[] }) {
  if (!items.length) {
    return <div className="rounded-lg bg-teal-50 p-5 text-sm font-bold text-ink/70 dark:bg-zinc-800 dark:text-white/70">Sem itens no relatório ainda.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
        <thead className="text-xs uppercase tracking-normal text-ink/60 dark:text-white/60">
          <tr>
            <th className="px-3 py-2">Palavra</th>
            <th className="px-3 py-2">Letra</th>
            <th className="px-3 py-2">Vídeo</th>
            <th className="px-3 py-2">Imagem</th>
            <th className="px-3 py-2">HTTP</th>
            <th className="px-3 py-2">Content-Type</th>
            <th className="px-3 py-2">Pode usar no Avatar</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Motivo/erro</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.word}-${index}`} className="bg-teal-50 text-sm font-semibold text-ink dark:bg-zinc-800 dark:text-white">
              <td className="rounded-l-lg px-3 py-3 text-base font-black">{item.word || "-"}</td>
              <td className="px-3 py-3">{item.letter || "-"}</td>
              <td className="px-3 py-3">
                <MediaBadge active={Boolean(item.video_url)} label={item.video_url ? "Com vídeo" : "Sem vídeo"} />
                {item.video_url ? <p className="mt-1 max-w-52 truncate text-xs text-ink/60 dark:text-white/60">{item.video_url}</p> : null}
              </td>
              <td className="px-3 py-3">
                <MediaBadge active={Boolean(item.image_url)} label={item.image_url ? "Imagem de apoio" : "Sem imagem"} tone="support" />
              </td>
              <td className="px-3 py-3">{item.http_status ?? "-"}</td>
              <td className="px-3 py-3">{item.content_type || "-"}</td>
              <td className="px-3 py-3">
                {item.can_use_avatar ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-1 text-xs font-black text-ink">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Sim
                  </span>
                ) : (
                  <span className="rounded-full bg-amber/25 px-2 py-1 text-xs font-black text-ink dark:text-white">Não</span>
                )}
              </td>
              <td className="px-3 py-3">{item.status || "-"}</td>
              <td className="rounded-r-lg px-3 py-3">
                <p>{item.reason || item.recommended_action || "-"}</p>
                {!item.can_use_avatar && item.image_url ? <p className="mt-1 text-xs font-black text-amber-900 dark:text-amber">Imagem é apenas apoio visual.</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MediaBadge({ active, label, tone = "primary" }: { active: boolean; label: string; tone?: "primary" | "support" }) {
  const activeClass = tone === "support" ? "bg-amber/25 text-ink dark:text-white" : "bg-mint text-ink";
  return <span className={`rounded-full px-2 py-1 text-xs font-black ${active ? activeClass : "bg-zinc-200 text-ink"}`}>{label}</span>;
}

function EmptyState() {
  return (
    <div className="mt-5 rounded-lg bg-teal-50 p-5 text-sm font-bold leading-relaxed text-ink/70 dark:bg-zinc-800 dark:text-white/70">
      Nenhum scan executado ainda. Comece com poucas letras, como A B C, revise o manifesto e só depois importe para curadoria.
    </div>
  );
}

function parseLetters(value: string) {
  const letters = value
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((letter) => letter.trim().toUpperCase().slice(0, 1))
    .filter((letter) => /^[A-Z]$/.test(letter));
  return Array.from(new Set(letters));
}
