"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileJson, RotateCcw, Search, Upload, XCircle } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  autoImportPendingInesMedia,
  autoImportSelectedInesMedia,
  diagnoseInesMediaImport,
  startInesMediaImport,
  validateInesMediaImport,
  type InesDiagnoseResponse,
  type InesImportItem,
  type InesImportJobResponse,
  type InesImportMode,
  type InesImportReport,
} from "@/services/api";

const DEFAULT_AUTHORIZATION = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu";
const EXAMPLE_CSV = "word,gloss,source_name,source_url,source_reference_url,video_url,avatar_video_url,gif_url,avatar_gif_url,image_url,license,license_notes,curator_notes,authorized";
const EXAMPLE_JSON = JSON.stringify(
  [
    {
      word: "bom dia",
      gloss: "BOM-DIA",
      source_reference_url: "https://dicionario.ines.gov.br/...",
      video_url: "https://...",
      avatar_video_url: "https://...",
      avatar_gif_url: "https://...",
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
  const [diagnoseWordsText, setDiagnoseWordsText] = useState("bom dia\nprofessor\naluno");
  const [diagnoseMaxItems, setDiagnoseMaxItems] = useState(10);
  const [diagnoseResult, setDiagnoseResult] = useState<InesDiagnoseResponse | null>(null);
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);

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

  async function diagnose() {
    setDiagnoseLoading(true);
    setDiagnoseResult(null);
    try {
      const response = await diagnoseInesMediaImport({
        words: parseWords(diagnoseWordsText),
        max_items: diagnoseMaxItems,
      });
      setDiagnoseResult(response);
      setMessage("Diagnóstico concluído. Nenhum dado foi alterado no banco.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível diagnosticar as palavras no INES.");
    } finally {
      setDiagnoseLoading(false);
    }
  }

  async function autoImportSelected() {
    setLoading(true);
    setResult(null);
    try {
      const response = await autoImportSelectedInesMedia({
        words: parseWords(diagnoseWordsText),
        max_items: diagnoseMaxItems,
        approve_authorized: approveAuthorized && !keepPending,
        overwrite,
      });
      setResult(response);
      setMessage("Importação assistida concluída para as palavras selecionadas. Revise e aprove os sinais antes de usar no Avatar Libras.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível importar as palavras selecionadas.");
    } finally {
      setLoading(false);
    }
  }

  async function autoImportPending() {
    setLoading(true);
    setResult(null);
    try {
      const response = await autoImportPendingInesMedia({
        max_items: diagnoseMaxItems,
        approve_authorized: approveAuthorized && !keepPending,
        overwrite,
      });
      setResult(response);
      setMessage("Importação assistida das próximas palavras pendentes concluída. Revise o relatório e faça a curadoria.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível importar palavras pendentes sem vídeo.");
    } finally {
      setLoading(false);
    }
  }

  function useDiagnosedWords() {
    const importableWords = diagnoseResult?.results.filter((item) => item.can_import).map((item) => item.word) ?? [];
    if (!importableWords.length) {
      setMessage("Nenhuma palavra diagnosticada está pronta para importação automática.");
      return;
    }
    setMode("selected_words");
    setWordsText(importableWords.join("\n"));
    setMessage("Palavras com diagnóstico positivo copiadas para o modo Palavras selecionadas. A importação ainda não foi iniciada.");
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
    setDiagnoseWordsText("bom dia\nprofessor\naluno");
    setDiagnoseMaxItems(10);
    setDiagnoseResult(null);
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
            <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">Importar mídias autorizadas</h1>
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
              Use apenas vídeos, GIFs ou imagens autorizadas. Registre fonte, URL específica, licença e observações. O padrão é vincular URL remota e manter os sinais pendentes para revisão.
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

            <section className="rounded-lg border border-ocean/15 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">Fluxo seguro sob demanda</p>
                  <h2 className="mt-1 text-xl font-black text-ink dark:text-white">Automação INES</h2>
                </div>
                <span className="rounded-full bg-amber/20 px-3 py-1 text-xs font-black text-ink dark:text-white">admin manual</span>
              </div>
              <div className="mt-3 space-y-2 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">
                <p>O diagnóstico não altera o banco de dados. Ele apenas verifica se o INES retorna página, palavra, imagem e vídeo de forma detectável pelo importador.</p>
                <p>
                  Se a página carregar, mas o vídeo não for encontrado, pode ser que o vídeo seja carregado por JavaScript/API e precise de integração específica ou importação manual por
                  JSON/CSV autorizado.
                </p>
                <p>
                  A importação assistida atualiza sinais em lotes pequenos, vincula URLs remotas autorizadas e mantém tudo como pendente para curadoria, salvo configuração explícita de aprovação.
                </p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_180px]">
                <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                  Palavras para diagnosticar, uma por linha
                  <textarea
                    className="focus-ring mt-2 min-h-36 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                    value={diagnoseWordsText}
                    onChange={(event) => setDiagnoseWordsText(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                  Máximo de itens
                  <input
                    className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                    min={1}
                    max={50}
                    type="number"
                    value={diagnoseMaxItems}
                    onChange={(event) => setDiagnoseMaxItems(Number(event.target.value))}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton tone="quiet" onClick={diagnose} disabled={diagnoseLoading}>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  {diagnoseLoading ? "Diagnosticando..." : "Diagnosticar"}
                </ActionButton>
                <ActionButton onClick={autoImportSelected} disabled={loading || !parseWords(diagnoseWordsText).length}>
                  Importar selecionadas
                </ActionButton>
                <ActionButton tone="secondary" onClick={autoImportPending} disabled={loading}>
                  Importar pendentes sem vídeo
                </ActionButton>
                <ActionButton tone="quiet" onClick={useDiagnosedWords} disabled={!diagnoseResult?.results.some((item) => item.can_import)}>
                  Usar palavras importáveis em selected_words
                </ActionButton>
              </div>

              {diagnoseResult && <DiagnosePanel result={diagnoseResult} />}
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
        <ReportCard label="Mídias encontradas" value={report.video_found_count} />
        <ReportCard label="Mídias não encontradas" value={report.video_missing_count} />
      </div>
      {report.items?.length ? <ImportItemsTable items={report.items} /> : null}
      <LogList title="Erros" items={report.errors} empty="Nenhum erro registrado." />
      <LogList title="Avisos" items={report.warnings ?? []} empty="Nenhum aviso registrado." />
      <LogList title="Precisam de importação manual" items={(report.manual_required ?? []).map((item) => ({ word: item.word, message: item.reason }))} empty="Nenhuma palavra pendente de importação manual neste relatório." />
    </section>
  );
}

function ImportItemsTable({ items }: { items: NonNullable<InesImportReport["items"]> }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-ink/10 dark:border-white/10">
      <table className="min-w-[960px] w-full border-collapse text-left text-sm">
        <thead className="bg-teal-50 text-xs font-black uppercase tracking-normal text-ink/70 dark:bg-zinc-800 dark:text-white/70">
          <tr>
            <th className="px-3 py-3">Palavra</th>
            <th className="px-3 py-3">Página</th>
            <th className="px-3 py-3">Palavra encontrada</th>
            <th className="px-3 py-3">Mídia</th>
            <th className="px-3 py-3">URL da mídia</th>
            <th className="px-3 py-3">Fonte</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Motivo</th>
            <th className="px-3 py-3">Ação recomendada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10 dark:divide-white/10">
          {items.map((item, index) => (
            <tr key={`${item.word}-${index}`} className="align-top">
              <td className="px-3 py-3 font-black text-ink dark:text-white">{item.word}</td>
              <td className="px-3 py-3"><BooleanBadge value={Boolean(item.page_loaded)} /></td>
              <td className="px-3 py-3"><BooleanBadge value={Boolean(item.word_found)} /></td>
              <td className="px-3 py-3"><BooleanBadge value={Boolean(item.video_found)} /></td>
              <td className="max-w-xs px-3 py-3">
                {item.video_url || item.avatar_gif_url ? (
                  <ExternalUrl href={item.video_url ?? item.avatar_gif_url} label={item.video_url ? "Abrir vídeo" : "Abrir GIF"} />
                ) : (
                  <span className="font-semibold text-ink/50 dark:text-white/50">Sem mídia</span>
                )}
              </td>
              <td className="max-w-xs px-3 py-3">
                {item.source_reference_url ? <ExternalUrl href={item.source_reference_url} label="Abrir fonte" subtle /> : <span className="font-semibold text-ink/50 dark:text-white/50">Sem fonte específica</span>}
              </td>
              <td className="px-3 py-3 font-bold text-ink/75 dark:text-white/75">{item.status ?? "pending"}</td>
              <td className="max-w-sm px-3 py-3 font-semibold leading-relaxed text-ink/70 dark:text-white/70">{item.reason}</td>
              <td className="max-w-xs px-3 py-3 font-black text-ocean dark:text-mint">{item.recommended_action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagnosePanel({ result }: { result: InesDiagnoseResponse }) {
  return (
    <div className="mt-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-black text-ink dark:text-white">Resultado do diagnóstico</h3>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-ink dark:bg-zinc-800 dark:text-white">{result.total_items} itens</span>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border border-ink/10 dark:border-white/10">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <thead className="bg-teal-50 text-xs font-black uppercase tracking-normal text-ink/70 dark:bg-zinc-800 dark:text-white/70">
            <tr>
              <th className="px-3 py-3">Palavra</th>
              <th className="px-3 py-3">Página carregada</th>
              <th className="px-3 py-3">Palavra encontrada</th>
              <th className="px-3 py-3">Imagem</th>
              <th className="px-3 py-3">Vídeo</th>
              <th className="px-3 py-3">Host permitido</th>
              <th className="px-3 py-3">Pode importar</th>
              <th className="px-3 py-3">Motivo</th>
              <th className="px-3 py-3">URL do vídeo</th>
              <th className="px-3 py-3">URL da fonte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 dark:divide-white/10">
            {result.results.map((item) => (
              <tr key={`${item.word}-${item.search_url}`} className="align-top">
                <td className="px-3 py-3 font-black text-ink dark:text-white">
                  <span>{item.word}</span>
                  <span className="mt-1 block text-xs font-semibold text-ink/55 dark:text-white/55">{item.normalized_word}</span>
                  {item.http_status ? <span className="mt-1 block text-xs font-semibold text-ink/55 dark:text-white/55">HTTP {item.http_status}</span> : null}
                </td>
                <td className="px-3 py-3"><BooleanBadge value={item.page_loaded} /></td>
                <td className="px-3 py-3"><BooleanBadge value={item.word_found_in_page} /></td>
                <td className="px-3 py-3"><BooleanBadge value={item.image_found} /></td>
                <td className="px-3 py-3"><BooleanBadge value={item.video_found} /></td>
                <td className="px-3 py-3"><BooleanBadge value={item.video_host_allowed} /></td>
                <td className="px-3 py-3"><BooleanBadge value={item.can_import} trueLabel="Sim" falseLabel="Não" /></td>
                <td className="max-w-xs px-3 py-3">
                  <p className="font-semibold leading-relaxed text-ink/75 dark:text-white/75">{item.reason}</p>
                  <DiagnosticMessages title="Avisos" tone="warning" items={item.warnings} />
                  <DiagnosticMessages title="Erros" tone="error" items={item.errors} />
                </td>
                <td className="max-w-xs px-3 py-3">
                  {item.video_url ? <ExternalUrl href={item.video_url} label="Abrir vídeo" /> : <span className="font-semibold text-ink/50 dark:text-white/50">Sem vídeo detectado</span>}
                </td>
                <td className="max-w-xs px-3 py-3">
                  <div className="space-y-2">
                    <ExternalUrl href={item.source_reference_url ?? item.search_url} label="Abrir fonte" />
                    <ExternalUrl href={item.search_url} label="URL de busca" subtle />
                    {item.image_url ? <ExternalUrl href={item.image_url} label="Imagem detectada" subtle /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BooleanBadge({ value, trueLabel = "Sim", falseLabel = "Não" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${value ? "bg-mint text-ink" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"}`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function DiagnosticMessages({ title, items, tone }: { title: string; items: string[]; tone: "warning" | "error" }) {
  if (!items.length) return null;
  const toneClass = tone === "warning" ? "bg-amber/20 text-ink dark:text-white" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200";
  return (
    <div className="mt-2 space-y-1">
      {items.map((item, index) => (
        <p key={`${title}-${index}`} className={`rounded-md px-2 py-1 text-xs font-bold leading-relaxed ${toneClass}`}>
          {title}: {item}
        </p>
      ))}
    </div>
  );
}

function ExternalUrl({ href, label, subtle }: { href?: string | null; label: string; subtle?: boolean }) {
  if (!href) return null;
  return (
    <a
      className={`focus-ring inline-flex max-w-full break-all rounded-md px-2 py-1 text-xs font-black ${
        subtle ? "bg-teal-50 text-ink/70 dark:bg-zinc-800 dark:text-white/70" : "bg-ocean text-white dark:bg-mint dark:text-ink"
      }`}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
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
