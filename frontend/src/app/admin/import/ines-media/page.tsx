"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileJson, RotateCcw, Upload, XCircle } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  startInesMediaImport,
  validateInesMediaImport,
  type InesImportItem,
  type InesImportJobResponse,
  type InesImportMode,
  type InesImportReport,
} from "@/services/api";

const DEFAULT_AUTHORIZATION = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu";
const EXAMPLE_CSV = "word,gloss,source_reference_url,video_url,avatar_video_url,image_url,license,license_notes,curator_notes,authorized";
const EXAMPLE_JSON = JSON.stringify(
  [
    {
      word: "bom dia",
      gloss: "BOM-DIA",
      source_reference_url: "https://dicionario.ines.gov.br/...",
      video_url: "https://...",
      avatar_video_url: "https://...",
      image_url: "https://...",
      license: DEFAULT_AUTHORIZATION,
      license_notes: "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu.",
      curator_notes: "Vídeo cadastrado com autorização formal.",
      authorized: true,
    },
  ],
  null,
  2
);

const modeLabels: Record<InesImportMode, string> = {
  pending_words: "Palavras pendentes sem vídeo",
  selected_words: "Palavras selecionadas",
  json_items: "Colar JSON",
  csv_items: "Colar CSV",
};

export default function InesMediaImportPage() {
  const auth = useRequireRole(["admin"]);
  const [mode, setMode] = useState<InesImportMode>("json_items");
  const [wordsText, setWordsText] = useState("bom dia\ntecnologia\ndados");
  const [jsonText, setJsonText] = useState(EXAMPLE_JSON);
  const [csvText, setCsvText] = useState(EXAMPLE_CSV);
  const [maxItems, setMaxItems] = useState(20);
  const [approveAuthorized, setApproveAuthorized] = useState(false);
  const [keepPending, setKeepPending] = useState(true);
  const [storeRemoteUrl, setStoreRemoteUrl] = useState(true);
  const [downloadMedia, setDownloadMedia] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<InesImportJobResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({
      mode,
      words: mode === "selected_words" ? parseWords(wordsText) : [],
      items: mode === "json_items" ? parseJsonItemsSafe(jsonText) : [],
      csv: mode === "csv_items" ? csvText : "",
      max_items: maxItems,
      approve_authorized: approveAuthorized && !keepPending,
      download_media: downloadMedia,
      store_remote_url: storeRemoteUrl,
      overwrite,
    }),
    [approveAuthorized, csvText, downloadMedia, jsonText, keepPending, maxItems, mode, overwrite, storeRemoteUrl, wordsText]
  );

  async function handleFile(file?: File | null) {
    if (!file) return;
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".csv")) {
      setMode("csv_items");
      setCsvText(text);
    } else {
      setMode("json_items");
      setJsonText(text);
    }
  }

  async function validate() {
    setLoading(true);
    setResult(null);
    try {
      const response = await validateInesMediaImport(payload);
      setResult(response);
      setMessage("Validação concluída. Nenhum dado foi alterado no banco.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível validar a importação.");
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    setLoading(true);
    setResult(null);
    try {
      const response = await startInesMediaImport(payload);
      setResult(response);
      setMessage("Importação concluída. Revise os sinais antes de usar em demonstrações públicas.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar a importação.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMode("json_items");
    setWordsText("bom dia\ntecnologia\ndados");
    setJsonText(EXAMPLE_JSON);
    setCsvText(EXAMPLE_CSV);
    setMaxItems(20);
    setApproveAuthorized(false);
    setKeepPending(true);
    setStoreRemoteUrl(true);
    setDownloadMedia(false);
    setOverwrite(false);
    setMessage("");
    setResult(null);
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
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">Rotina administrativa sob demanda</p>
            <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">Importar vídeos autorizados do INES</h1>
            <p className="mt-2 max-w-3xl text-base font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Esta rotina não roda no build/deploy. Ela só é executada sob demanda por administradores, com limite, relatório e auditoria por sinal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="focus-ring rounded-lg bg-white px-4 py-3 font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin?status=pending">
              Ver sinais pendentes
            </Link>
            <Link className="focus-ring rounded-lg bg-white px-4 py-3 font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
              Voltar para curadoria
            </Link>
          </div>
        </div>

        <section className="rounded-lg border border-amber/30 bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:border-amber/30 dark:text-white">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              Use apenas vídeos autorizados. Registre fonte, URL específica, licença e observações. O padrão é vincular URL remota e manter os sinais pendentes para revisão.
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div>
              <h2 className="text-xl font-black text-ink dark:text-white">Modo de importação</h2>
              <div className="mt-3 grid gap-2">
                {(Object.keys(modeLabels) as InesImportMode[]).map((item) => (
                  <button
                    key={item}
                    className={`focus-ring min-h-12 rounded-lg px-4 py-3 text-left text-sm font-black ${
                      mode === item ? "bg-ocean text-white" : "bg-teal-50 text-ink dark:bg-zinc-800 dark:text-white"
                    }`}
                    onClick={() => setMode(item)}
                  >
                    {modeLabels[item]}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
              Máximo de itens por execução
              <input
                className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                min={1}
                max={50}
                type="number"
                value={maxItems}
                onChange={(event) => setMaxItems(Number(event.target.value))}
              />
            </label>

            <Toggle label="Manter como pendente para revisão" checked={keepPending} onChange={setKeepPending} />
            <Toggle label="Aprovar itens autorizados com vídeo" checked={approveAuthorized} onChange={setApproveAuthorized} disabled={keepPending} />
            <Toggle label="Apenas vincular URL remota" checked={storeRemoteUrl} onChange={setStoreRemoteUrl} />
            <Toggle label="Não baixar arquivos" checked={!downloadMedia} onChange={(checked) => setDownloadMedia(!checked)} />
            <Toggle label="Permitir sobrescrever sinal aprovado" checked={overwrite} onChange={setOverwrite} />

            <div className="rounded-lg bg-teal-50 p-3 text-xs font-bold leading-relaxed text-ink/70 dark:bg-zinc-800 dark:text-white/70">
              Para aprovação automática, o backend também precisa de <code>INES_IMPORT_APPROVE_AUTHORIZED=true</code>. Caso contrário, tudo fica pending.
            </div>
          </aside>

          <div className="space-y-4">
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-xl font-black text-ink dark:text-white">{modeLabels[mode]}</h2>
              <ModeInput
                mode={mode}
                wordsText={wordsText}
                setWordsText={setWordsText}
                jsonText={jsonText}
                setJsonText={setJsonText}
                csvText={csvText}
                setCsvText={setCsvText}
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ActionButton tone="quiet" onClick={validate} disabled={loading}>
                  <FileJson className="h-5 w-5" aria-hidden="true" />
                  Validar
                </ActionButton>
                <ActionButton onClick={start} disabled={loading}>
                  {loading ? "Processando..." : "Iniciar importação"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={reset} disabled={loading}>
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Limpar formulário
                </ActionButton>
                <label className="focus-ring inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  Carregar JSON/CSV
                  <input className="sr-only" type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
                </label>
              </div>

              {message && (
                <p role="status" className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink/75 dark:bg-zinc-800 dark:text-white/75">
                  {message}
                </p>
              )}
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-xl font-black text-ink dark:text-white">Exemplos de formato</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <pre className="overflow-x-auto rounded-lg bg-teal-50 p-3 text-xs font-bold text-ink dark:bg-zinc-800 dark:text-white">{EXAMPLE_JSON}</pre>
                <pre className="overflow-x-auto rounded-lg bg-teal-50 p-3 text-xs font-bold text-ink dark:bg-zinc-800 dark:text-white">{EXAMPLE_CSV}</pre>
              </div>
            </section>

            {result && <ReportPanel result={result} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function ModeInput({
  mode,
  wordsText,
  setWordsText,
  jsonText,
  setJsonText,
  csvText,
  setCsvText,
}: {
  mode: InesImportMode;
  wordsText: string;
  setWordsText: (value: string) => void;
  jsonText: string;
  setJsonText: (value: string) => void;
  csvText: string;
  setCsvText: (value: string) => void;
}) {
  if (mode === "pending_words") {
    return (
      <p className="mt-3 rounded-lg bg-teal-50 p-4 text-sm font-bold leading-relaxed text-ink/70 dark:bg-zinc-800 dark:text-white/70">
        O backend buscará sinais pending sem vídeo, respeitando o limite configurado. Nenhum sinal será aprovado automaticamente por padrão.
      </p>
    );
  }
  if (mode === "selected_words") {
    return (
      <label className="mt-3 block text-sm font-bold text-ink/70 dark:text-white/70">
        Lista de palavras, uma por linha
        <textarea
          className="focus-ring mt-2 min-h-56 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
          value={wordsText}
          onChange={(event) => setWordsText(event.target.value)}
        />
      </label>
    );
  }
  if (mode === "csv_items") {
    return (
      <label className="mt-3 block text-sm font-bold text-ink/70 dark:text-white/70">
        CSV autorizado
        <textarea
          className="focus-ring mt-2 min-h-72 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-mono text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-white"
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
        />
      </label>
    );
  }
  return (
    <label className="mt-3 block text-sm font-bold text-ink/70 dark:text-white/70">
      JSON autorizado
      <textarea
        className="focus-ring mt-2 min-h-72 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-mono text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-white"
        value={jsonText}
        onChange={(event) => setJsonText(event.target.value)}
      />
    </label>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white ${disabled ? "opacity-60" : ""}`}>
      <span>{label}</span>
      <input className="h-5 w-5 accent-ocean" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ReportPanel({ result }: { result: InesImportJobResponse }) {
  const report = result.report;
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        {result.status === "completed" || result.status === "validated" ? (
          <CheckCircle2 className="h-6 w-6 text-ocean dark:text-mint" aria-hidden="true" />
        ) : (
          <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
        )}
        <h2 className="text-xl font-black text-ink dark:text-white">Relatório</h2>
        {result.job_id && <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-ink dark:bg-zinc-800 dark:text-white">Job #{result.job_id}</span>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <ReportCard label="Total" value={report.total_items} />
        <ReportCard label="Processados" value={report.processed_items} />
        <ReportCard label="Criados" value={report.created_count} />
        <ReportCard label="Atualizados" value={report.updated_count} />
        <ReportCard label="Aprovados" value={report.approved_count} />
        <ReportCard label="Pendentes" value={report.pending_count} />
        <ReportCard label="Ignorados" value={report.skipped_count} />
        <ReportCard label="Erros" value={report.error_count} />
      </div>
      <LogList title="Erros" items={report.errors} empty="Nenhum erro registrado." />
      <LogList title="Avisos" items={report.warnings ?? []} empty="Nenhum aviso registrado." />
    </section>
  );
}

function ReportCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg bg-teal-50 p-3 dark:bg-zinc-800">
      <p className="text-xs font-black uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink dark:text-white">{value ?? 0}</p>
    </div>
  );
}

function LogList({ title, items, empty }: { title: string; items: InesImportReport["errors"]; empty: string }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-black text-ink dark:text-white">{title}</h3>
      <div className="mt-2 space-y-2">
        {(items.length ? items : [{ word: null, message: empty }]).map((item, index) => (
          <p key={`${title}-${item.word ?? "item"}-${index}`} className="rounded-lg bg-teal-50 p-3 text-sm font-semibold text-ink/70 dark:bg-zinc-800 dark:text-white/70">
            {item.word ? `${item.word}: ` : ""}
            {item.message}
          </p>
        ))}
      </div>
    </div>
  );
}

function parseWords(text: string) {
  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonItemsSafe(text: string): InesImportItem[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    const items = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : [];
    return items.map((item) => (typeof item === "object" && item !== null ? (item as InesImportItem) : {}));
  } catch {
    return [];
  }
}
