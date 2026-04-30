"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileJson, Upload, XCircle } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import { importInesAuthorizedMedia } from "@/services/api";

type ImportReport = {
  status?: string;
  total_records?: number;
  imported_records?: number;
  updated_records?: number;
  failed_records?: number;
  logs?: Array<{ level?: string; row?: number | null; message?: string }>;
};

const DEFAULT_AUTHORIZATION = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu";
const EXAMPLE_CSV = "word,gloss,source_reference_url,video_url,avatar_video_url,license,license_notes";

export default function InesMediaImportPage() {
  const auth = useRequireRole(["admin"]);
  const [sourceType, setSourceType] = useState<"json" | "csv">("json");
  const [content, setContent] = useState("");
  const [authorizationReference, setAuthorizationReference] = useState(DEFAULT_AUTHORIZATION);
  const [validationMessage, setValidationMessage] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);

  const records = useMemo(() => {
    try {
      return parseRecords(content, sourceType);
    } catch {
      return [];
    }
  }, [content, sourceType]);

  function validateContent() {
    try {
      const parsed = parseRecords(content, sourceType);
      if (!parsed.length) {
        setValidationMessage("Nenhum registro encontrado. Cole JSON/CSV com pelo menos uma palavra.");
        return;
      }
      const missingVideo = parsed.filter((item) => !item.video_url && !item.avatar_video_url).length;
      setValidationMessage(
        `${parsed.length} registro(s) válidos para importação. ${missingVideo} registro(s) sem vídeo serão importados como pendentes sem mídia.`
      );
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "Não foi possível validar o conteúdo.");
    }
  }

  async function handleFile(file?: File | null) {
    if (!file) return;
    setContent(await file.text());
    setSourceType(file.name.toLowerCase().endsWith(".csv") ? "csv" : "json");
  }

  async function handleImport() {
    setLoading(true);
    setReport(null);
    try {
      const parsed = parseRecords(content, sourceType);
      const result = await importInesAuthorizedMedia({
        source: "admin-inline-import",
        source_type: sourceType,
        records: parsed,
        download_media: false,
        authorized: true,
        authorization_reference: authorizationReference,
      });
      setReport(result as ImportReport);
      setValidationMessage("Importação enviada. Os sinais continuam pendentes até revisão e aprovação.");
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "Falha ao importar vídeos autorizados.");
    } finally {
      setLoading(false);
    }
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
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">Curadoria INES</p>
            <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">Importar vídeos autorizados</h1>
            <p className="mt-2 max-w-3xl text-base font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Cole um JSON/CSV autorizado com URLs reais. A importação não aprova automaticamente e não oferece download de mídia ao aluno.
            </p>
          </div>
          <Link className="focus-ring rounded-lg bg-white px-4 py-3 font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
            Voltar para curadoria
          </Link>
        </div>

        <section className="rounded-lg border border-amber/30 bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:border-amber/30 dark:text-white">
          Use apenas vídeos autorizados para o projeto. Registre fonte, URL específica do sinal e observação de licença. Todo registro entra como
          <span className="mx-1 rounded-full bg-white px-2 py-1 text-xs text-ink">pending</span>
          até validação por especialista/admin.
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
              Formato
              <select
                className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as "json" | "csv")}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
              Referência da autorização
              <input
                className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                value={authorizationReference}
                onChange={(event) => setAuthorizationReference(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
            <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
              Conteúdo JSON/CSV
              <textarea
                className="focus-ring mt-2 min-h-72 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-mono text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={sourceType === "csv" ? EXAMPLE_CSV : JSON.stringify([{ word: "bom dia", gloss: "BOM-DIA" }], null, 2)}
              />
            </label>
            <div className="space-y-3 rounded-lg bg-teal-50 p-4 dark:bg-zinc-800">
              <h2 className="text-lg font-black text-ink dark:text-white">Formato esperado</h2>
              <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs font-bold text-ink dark:bg-zinc-950 dark:text-white">{EXAMPLE_CSV}</pre>
              <label className="focus-ring flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint">
                <Upload className="h-5 w-5" aria-hidden="true" />
                Carregar arquivo
                <input className="sr-only" type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
              </label>
              <p className="text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">
                URLs com placeholders ou sem http(s) serão recusadas no backend para evitar registros falsos.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ActionButton tone="quiet" onClick={validateContent}>
              <FileJson className="h-5 w-5" aria-hidden="true" />
              Validar arquivo
            </ActionButton>
            <ActionButton onClick={handleImport} disabled={!records.length || !authorizationReference || loading}>
              {loading ? "Importando..." : "Importar vídeos autorizados"}
            </ActionButton>
            {validationMessage && (
              <p role="status" className="text-sm font-bold text-ink/70 dark:text-white/70">
                {validationMessage}
              </p>
            )}
          </div>
        </section>

        {report && (
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              {report.status === "completed" ? (
                <CheckCircle2 className="h-6 w-6 text-ocean dark:text-mint" aria-hidden="true" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
              )}
              <h2 className="text-xl font-black text-ink dark:text-white">Relatório de importação</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <ReportCard label="Total" value={report.total_records} />
              <ReportCard label="Criados" value={report.imported_records} />
              <ReportCard label="Atualizados" value={report.updated_records} />
              <ReportCard label="Falhas" value={report.failed_records} />
            </div>
            <div className="mt-4 space-y-2">
              {(report.logs ?? []).slice(-10).map((item, index) => (
                <p key={`${item.level}-${item.row}-${index}`} className="rounded-lg bg-teal-50 p-3 text-sm font-semibold text-ink/70 dark:bg-zinc-800 dark:text-white/70">
                  {item.level ?? "log"} {item.row ? `linha ${item.row}: ` : ""}
                  {item.message}
                </p>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ReportCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg bg-teal-50 p-4 dark:bg-zinc-800">
      <p className="text-sm font-black uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink dark:text-white">{value ?? 0}</p>
    </div>
  );
}

function parseRecords(content: string, sourceType: "json" | "csv"): Array<Record<string, string>> {
  if (!content.trim()) return [];
  if (sourceType === "json") {
    const parsed = JSON.parse(content) as unknown;
    const records = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : null;
    if (!records) throw new Error("JSON deve ser uma lista ou um objeto com items.");
    return records.map((item) => stringifyRecord(item));
  }

  const [headerLine, ...lines] = content.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine).map((header) => header.trim());
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const values = splitCsvLine(line);
      return headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = values[index]?.trim() ?? "";
        return record;
      }, {});
    });
}

function stringifyRecord(item: unknown): Record<string, string> {
  if (typeof item !== "object" || item === null) return {};
  return Object.entries(item as Record<string, unknown>).reduce<Record<string, string>>((record, [key, value]) => {
    record[key] = value == null ? "" : String(value);
    return record;
  }, {});
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}
