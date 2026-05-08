"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, RotateCcw, Search, Wand2, XCircle } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  diagnoseMediaAutoFill,
  startMediaAutoFillPending,
  startMediaAutoFillSelected,
  type MediaAutoFillReport,
  type MediaAutoFillReportItem,
  type MediaAutoFillResponse,
  type MediaAutoFillSource,
} from "@/services/api";

type SourceMode = "ines" | "ifpr" | "ines-ifpr" | "ifpr-ines";

const sourceLabels: Record<SourceMode, string> = {
  ines: "INES",
  ifpr: "IFPR GIFs",
  "ines-ifpr": "INES depois IFPR",
  "ifpr-ines": "IFPR depois INES",
};

export default function MediaAutoFillPage() {
  const auth = useRequireRole(["admin"]);
  const [wordsText, setWordsText] = useState("bom dia\nprofessor\naluno\nescola\nlivro");
  const [sourceMode, setSourceMode] = useState<SourceMode>("ines-ifpr");
  const [maxItems, setMaxItems] = useState(10);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<MediaAutoFillResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<"diagnose" | "selected" | "pending" | null>(null);

  const sourcePriority = useMemo(() => priorityForMode(sourceMode), [sourceMode]);
  const parsedWords = useMemo(() => parseWords(wordsText), [wordsText]);

  async function runDiagnose() {
    setLoadingAction("diagnose");
    setResult(null);
    try {
      const response = await diagnoseMediaAutoFill({
        words: parsedWords,
        max_items: maxItems,
        source_priority: sourcePriority,
      });
      setResult(response);
      setMessage("Diagnóstico concluído. Nenhum dado foi alterado no banco.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível diagnosticar as palavras.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function runSelected() {
    setLoadingAction("selected");
    setResult(null);
    try {
      const response = await startMediaAutoFillSelected({
        words: parsedWords,
        max_items: maxItems,
        source_priority: sourcePriority,
        overwrite,
      });
      setResult(response);
      setMessage("Preenchimento das palavras selecionadas concluído. Revise e aprove manualmente antes do Avatar Libras usar a mídia.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível preencher as palavras selecionadas.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function runPending() {
    setLoadingAction("pending");
    setResult(null);
    try {
      const response = await startMediaAutoFillPending({
        max_items: maxItems,
        source_priority: sourcePriority,
        overwrite,
      });
      setResult(response);
      setMessage("Preenchimento das próximas pendentes concluído. A curadoria continua obrigatória antes do uso oficial.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível preencher as próximas palavras pendentes.");
    } finally {
      setLoadingAction(null);
    }
  }

  function reset() {
    setWordsText("bom dia\nprofessor\naluno\nescola\nlivro");
    setSourceMode("ines-ifpr");
    setMaxItems(10);
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
            <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">Preenchimento automático de mídias</h1>
            <p className="mt-2 text-base font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Busque automaticamente vídeos/GIFs autorizados para palavras sem mídia. A rotina não aprova sinais; ela apenas preenche URLs e mantém tudo pendente para curadoria.
            </p>
          </div>
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
            Voltar para curadoria
          </Link>
        </div>

        <section className="rounded-lg border border-amber/40 bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:border-amber/30 dark:text-white" role="note">
          Esta rotina não roda no build/deploy/startup. Ela só é executada quando um admin aciona manualmente. Nenhum vídeo, GIF ou imagem é baixado para o Git; o sistema apenas vincula URLs públicas autorizadas e registra auditoria.
        </section>

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-xl font-black text-ink dark:text-white">Configuração do lote</h2>
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
                Fontes
                <select
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={sourceMode}
                  onChange={(event) => setSourceMode(event.target.value as SourceMode)}
                >
                  {(Object.keys(sourceLabels) as SourceMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {sourceLabels[mode]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                Máximo de itens por execução
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
                Sobrescrever mídia existente. Use apenas quando precisar revalidar um sinal já preenchido.
              </label>

              <div className="grid gap-2">
                <ActionButton onClick={runDiagnose} disabled={loadingAction !== null || parsedWords.length === 0}>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  {loadingAction === "diagnose" ? "Diagnosticando..." : "Diagnosticar palavras"}
                </ActionButton>
                <ActionButton tone="secondary" onClick={runSelected} disabled={loadingAction !== null || parsedWords.length === 0}>
                  <Wand2 className="h-5 w-5" aria-hidden="true" />
                  {loadingAction === "selected" ? "Preenchendo..." : "Preencher palavras selecionadas"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={runPending} disabled={loadingAction !== null}>
                  <Wand2 className="h-5 w-5" aria-hidden="true" />
                  {loadingAction === "pending" ? "Preenchendo..." : "Preencher próximas pendentes sem mídia"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={reset} disabled={loadingAction !== null}>
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Limpar
                </ActionButton>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-xl font-black text-ink dark:text-white">Relatório</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">
                O preenchimento mantém tudo como <strong>pending</strong>. Para o Avatar Libras exibir mídia, revise fonte/licença e aprove manualmente um sinal com vídeo, GIF ou animação. Imagem estática é apenas apoio visual.
              </p>
              {message && (
                <div className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white" role="status">
                  {message}
                </div>
              )}
              {result ? <ReportPanel report={result.report} /> : <EmptyReport />}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ReportPanel({ report }: { report: MediaAutoFillReport }) {
  const readyForAvatar = report.items.filter((item) => item.can_use_avatar).length;
  const supportOnlyImages = report.items.filter((item) => item.image_found && !item.can_use_avatar).length;
  const animationCount = report.items.filter((item) => item.media_type === "animation" || item.avatar_animation_url).length;
  const cards = [
    ["Total", report.total_items],
    ["Processados", report.processed_items],
    ["Vídeos", report.video_found_count],
    ["GIFs", report.gif_found_count],
    ["Animações", animationCount],
    ["Imagens de apoio", report.image_found_count],
    ["Prontos para Avatar", readyForAvatar],
    ["Não servem para Avatar", supportOnlyImages],
    ["Sem mídia", report.media_missing_count],
    ["Atualizados", report.updated_count],
    ["Criados", report.created_count],
    ["Erros", report.error_count],
  ];

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-teal-50 p-4 dark:bg-zinc-800">
            <p className="text-xs font-black uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</p>
            <p className="mt-1 text-3xl font-black text-ink dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {report.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900 dark:border-red-400/40 dark:bg-red-950/30 dark:text-red-100">
          <div className="mb-2 flex items-center gap-2">
            <XCircle className="h-5 w-5" aria-hidden="true" />
            Erros do lote
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {report.errors.map((error, index) => (
              <li key={`${error.word ?? "erro"}-${index}`}>
                {error.word ? `${error.word}: ` : ""}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="uppercase tracking-normal text-ink/60 dark:text-white/60">
            <tr>
              <th className="px-3 py-2">Palavra</th>
              <th className="px-3 py-2">Fonte usada</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Encontrou</th>
              <th className="px-3 py-2">Video</th>
              <th className="px-3 py-2">GIF</th>
              <th className="px-3 py-2">Imagem</th>
              <th className="px-3 py-2">Avatar</th>
              <th className="px-3 py-2">URL da mídia</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Motivo</th>
              <th className="px-3 py-2">Ação recomendada</th>
            </tr>
          </thead>
          <tbody>
            {report.items.map((item, index) => (
              <ReportRow key={`${item.word}-${index}`} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportRow({ item }: { item: MediaAutoFillReportItem }) {
  const mediaUrl = item.video_url || item.avatar_gif_url || item.avatar_animation_url || item.image_url;
  return (
    <tr className="bg-teal-50 font-semibold text-ink dark:bg-zinc-800 dark:text-white">
      <td className="rounded-l-lg px-3 py-3 text-base font-black">{item.word}</td>
      <td className="px-3 py-3">{item.source_used || "nenhuma"}</td>
      <td className="px-3 py-3">{mediaTypeLabel(item.media_type)}</td>
      <td className="px-3 py-3">
        <StatusBadge ok={Boolean(item.media_found)} />
      </td>
      <td className="px-3 py-3">
        <StatusBadge ok={Boolean(item.video_found)} compact />
      </td>
      <td className="px-3 py-3">
        <StatusBadge ok={Boolean(item.gif_found)} compact />
      </td>
      <td className="px-3 py-3">
        <StatusBadge ok={Boolean(item.image_found)} compact />
      </td>
      <td className="px-3 py-3">
        <StatusBadge ok={Boolean(item.can_use_avatar)} compact />
      </td>
      <td className="max-w-72 px-3 py-3">
        {mediaUrl ? (
          <a className="break-all text-ocean underline-offset-4 hover:underline dark:text-mint" href={mediaUrl} target="_blank" rel="noreferrer">
            Abrir mídia
          </a>
        ) : (
          <span className="text-ink/60 dark:text-white/60">Sem URL</span>
        )}
      </td>
      <td className="px-3 py-3">{item.status}</td>
      <td className="max-w-sm px-3 py-3">
        <div>{item.reason || "Sem motivo informado."}</div>
        {item.image_found && !item.can_use_avatar ? (
          <p className="mt-2 rounded-lg bg-amber/20 px-2 py-1 text-xs font-black text-amber-900 dark:text-amber-100">
            Apenas imagem de apoio. Não há movimento em Libras.
          </p>
        ) : null}
        {(item.warnings?.length || item.errors?.length) ? (
          <div className="mt-2 space-y-1 text-xs">
            {item.warnings?.map((warning) => (
              <p key={warning} className="flex items-start gap-1 text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" aria-hidden="true" />
                {warning}
              </p>
            ))}
            {item.errors?.map((error) => (
              <p key={error} className="flex items-start gap-1 text-red-900 dark:text-red-100">
                <XCircle className="mt-0.5 h-3.5 w-3.5" aria-hidden="true" />
                {error}
              </p>
            ))}
          </div>
        ) : null}
      </td>
      <td className="rounded-r-lg px-3 py-3">{item.recommended_action || "Revisar"}</td>
    </tr>
  );
}

function EmptyReport() {
  return (
    <div className="mt-5 rounded-lg bg-teal-50 p-5 text-sm font-bold leading-relaxed text-ink/70 dark:bg-zinc-800 dark:text-white/70">
      Nenhum relatório ainda. Use Diagnosticar para verificar as fontes sem alterar o banco, ou execute um preenchimento em lote pequeno.
    </div>
  );
}

function StatusBadge({ ok, compact = false }: { ok: boolean; compact?: boolean }) {
  const label = ok ? "Sim" : "Nao";
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-1 text-xs font-black text-ink">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      {compact ? label : "Sim"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-1 text-xs font-black text-ink">
      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function priorityForMode(mode: SourceMode): MediaAutoFillSource[] {
  if (mode === "ines") return ["ines"];
  if (mode === "ifpr") return ["ifpr"];
  if (mode === "ifpr-ines") return ["ifpr", "ines"];
  return ["ines", "ifpr"];
}

function mediaTypeLabel(type?: string) {
  if (type === "video") return "Vídeo";
  if (type === "gif") return "GIF";
  if (type === "image") return "Imagem de apoio";
  if (type === "animation") return "Animação";
  if (type === "existing") return "Existente";
  return "Sem mídia";
}

function parseWords(value: string) {
  return Array.from(new Set(value.split(/\r?\n|,/).map((word) => word.trim()).filter(Boolean)));
}
