"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Database, FileJson, Filter, Pencil, PlusCircle, RefreshCcw, Upload } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { LibrasLiveIcon } from "@/components/LibrasLiveIcon";
import { ModeBadge } from "@/components/ModeBadge";
import { SignCurationIllustration } from "@/components/illustrations/SignCurationIllustration";
import { PageHero } from "@/components/ui/ProductUI";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  curateSign,
  getAdminStats,
  importSampleCsv,
  importSampleJson,
  importViaApi,
  listSignAudit,
  listCategories,
  listSigns,
  listSubjects,
  rejectSign,
  updateSignMedia,
  validateMediaUrl,
  type MediaValidationResult
} from "@/services/api";
import type { AdminStats, SignCategory, SignRecord, Subject } from "@/types/live";

const INES_SOURCE_NAME = "Dicionário da Língua Brasileira de Sinais - INES";
const INES_SOURCE_URL = "https://dicionario.ines.gov.br/";
const INES_LICENSE = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu";
const INES_LICENSE_NOTES = "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu.";

const fallbackStats: AdminStats = {
  total_signs: 180,
  approved_signs: 0,
  pending_signs: 180,
  rejected_signs: 0,
  review_signs: 0,
  import_jobs: 1,
  no_video_signs: 180,
  video_signs: 0,
  gif_signs: 0,
  pending_with_video_signs: 0,
  pending_with_media_signs: 0,
  approved_with_video_signs: 0,
  ready_for_avatar_signs: 0,
  needs_curation_signs: 180
};

const fallbackSigns: SignRecord[] = [
  { id: 1, word: "professor", normalized_word: "professor", status: "pending", source_name: "Seed educacional inicial", license: "Aguardando curadoria", curator_notes: "Registro inicial para curadoria por especialista em Libras" },
  { id: 2, word: "tecnologia", normalized_word: "tecnologia", status: "pending", source_name: "Seed educacional inicial", license: "Aguardando curadoria", curator_notes: "Registro inicial para curadoria por especialista em Libras" },
  { id: 3, word: "energia", normalized_word: "energia", status: "pending", source_name: "Seed educacional inicial", license: "Aguardando curadoria", curator_notes: "Registro inicial para curadoria por especialista em Libras" }
];

export default function AdminPage() {
  const auth = useRequireRole(["admin", "curator"]);
  const [stats, setStats] = useState<AdminStats>(fallbackStats);
  const [signs, setSigns] = useState<SignRecord[]>(fallbackSigns);
  const [word, setWord] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [inesOnly, setInesOnly] = useState(false);
  const [categories, setCategories] = useState<SignCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<SignRecord | null>(fallbackSigns[0]);
  const [auditLog, setAuditLog] = useState<Array<{ id: number; action: string; created_at: string }>>([]);
  const [message, setMessage] = useState("Modo demo ativo: dados locais aparecem se a API estiver offline.");
  const [mediaValidation, setMediaValidation] = useState<MediaValidationResult | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (word) search.set("word", word);
    if (status) search.set("status", status);
    if (categoryId) search.set("category_id", categoryId);
    if (subjectId) search.set("subject_id", subjectId);
    if (inesOnly) search.set("source_name", INES_SOURCE_NAME);
    return search;
  }, [word, status, categoryId, subjectId, inesOnly]);

  function refresh() {
    getAdminStats().then(setStats).catch(() => setStats(fallbackStats));
    listCategories().then(setCategories).catch(() => setCategories([]));
    listSubjects().then(setSubjects).catch(() => setSubjects([]));
    listSigns(params).then((items) => {
      setSigns(items.length ? items : fallbackSigns);
      setSelected(items[0] ?? fallbackSigns[0]);
    }).catch(() => {
      setSigns(fallbackSigns);
      setSelected(fallbackSigns[0]);
    });
  }

  useEffect(() => {
    refresh();
  }, [params]);

  async function approveSelected() {
    if (!selected) return;
    const hasMedia = Boolean(selected.avatar_video_url || selected.video_url || selected.avatar_gif_url || selected.avatar_animation_url);
    if (!hasMedia && !selected.gloss) {
      setMessage("Preencha glosa ou mídia autorizada antes de aprovar o sinal.");
      return;
    }
    const warning = hasMedia
      ? "Confirme que o sinal foi validado por especialista em Libras e que a mídia possui autorização de uso registrada."
      : "Sinal aprovado sem mídia. Ele aparecerá como glosa/card, mas não no Avatar Libras. Confirma a aprovação?";
    const confirmed = window.confirm(warning);
    if (!confirmed) return;
    const updated = await curateSign(selected.id, {
      status: "approved",
      curator_notes: selected.curator_notes || "Sinal validado. Vídeo autorizado para uso no projeto LibrasLive Edu.",
    }).catch(() => null);
    if (!updated) {
      setMessage("Aprovação bloqueada. Confirme fonte, licença, observação de autorização e evidências antes de aprovar.");
      return;
    }
    setSelected(updated);
    setSigns((current) => current.map((sign) => (sign.id === updated.id ? updated : sign)));
  }

  function selectSign(sign: SignRecord) {
    setSelected(sign);
    setMediaValidation(null);
    listSignAudit(sign.id).then(setAuditLog).catch(() => setAuditLog([]));
  }

  function prepareInesMedia(sign: SignRecord) {
    setSelected({
      ...sign,
      source_name: sign.source_name && sign.source_name !== "Seed educacional inicial" ? sign.source_name : INES_SOURCE_NAME,
      source_url: sign.source_url || INES_SOURCE_URL,
      license: sign.license && sign.license !== "Aguardando curadoria" ? sign.license : INES_LICENSE,
      license_notes: sign.license_notes || INES_LICENSE_NOTES,
      curator_notes: sign.curator_notes || "Vídeo autorizado cadastrado para exibição no Avatar Libras.",
    });
    listSignAudit(sign.id).then(setAuditLog).catch(() => setAuditLog([]));
    setMessage(`Revise a palavra "${sign.word}", cole a URL específica do INES e informe o vídeo autorizado.`);
  }

  async function rejectSelected() {
    if (!selected) return;
    const updated = await rejectSign(selected.id, selected.curator_notes || "Reprovado durante curadoria.").catch(() => null);
    if (!updated) {
      setMessage("Não foi possível reprovar agora. Verifique login de admin/curador.");
      return;
    }
    setSelected(updated);
    setSigns((current) => current.map((sign) => (sign.id === updated.id ? updated : sign)));
    setMessage("Sinal rejeitado com justificativa registrada no histórico.");
  }

  async function saveSelected() {
    if (!selected) return;
    const updated = await updateSignMedia(selected.id, {
      gloss: selected.gloss,
      source_name: selected.source_name,
      source_url: selected.source_url,
      source_reference_url: selected.source_reference_url,
      license: selected.license,
      license_notes: selected.license_notes,
      video_url: selected.video_url,
      avatar_video_url: selected.avatar_video_url,
      avatar_gif_url: selected.avatar_gif_url,
      avatar_animation_url: selected.avatar_animation_url,
      image_url: selected.image_url,
      curator_notes: selected.curator_notes,
    }).catch(() => null);
    if (!updated) {
      setMessage("Não foi possível salvar a mídia. Verifique login, fonte/licença e URLs começando com http:// ou https://.");
      return;
    }
    setSelected(updated);
    setSigns((current) => current.map((sign) => (sign.id === updated.id ? updated : sign)));
    setMessage("Mídia e curadoria salvas. O sinal permanece no status atual até aprovação por admin/curador.");
  }

  async function testSelectedMedia() {
    if (!selected) return;
    const videoUrl = selected.avatar_video_url || selected.video_url;
    const url = videoUrl || selected.avatar_gif_url || selected.avatar_animation_url;
    if (!url) {
      setMessage("Informe uma URL de vídeo, GIF ou animação antes de testar.");
      return;
    }
    const expected_type = videoUrl ? "video" : selected.avatar_gif_url ? "gif" : "animation";
    const result = await validateMediaUrl({ url, expected_type }).catch(() => null);
    if (!result) {
      setMessage("Não foi possível testar a mídia agora.");
      return;
    }
    setMediaValidation(result);
    setMessage(result.valid ? "Mídia validada. Revise fonte/licença antes de aprovar." : "Esta mídia não carregou corretamente. Não aprove como Avatar.");
  }

  async function runSampleImport() {
    const result = await importSampleJson().catch(() => null);
    setMessage(result ? "Importação JSON enviada. Consulte o relatório no backend." : "API offline: importação JSON ficará disponível ao iniciar o backend.");
  }

  async function runCsvImport() {
    const result = await importSampleCsv().catch(() => null);
    setMessage(result ? "Importação CSV enviada. Consulte o relatório no backend." : "API offline: importação CSV ficará disponível ao iniciar o backend.");
  }

  async function runApiImport() {
    const result = await importViaApi().catch(() => null);
    setMessage(result ? "Importação via API solicitada." : "VLibras/API não configurada ou backend offline.");
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
        eyebrow="Curadoria e cobertura de sinais"
        title="Administração de sinais"
        description="Escolha entre cadastro manual, preenchimento automático pelo INES ou importação em lote. Valide as mídias e acompanhe o que está pronto para revisão."
        actions={
          <>
            <Link
              aria-label="Adicionar novas palavras: cadastrar manualmente ou gerar vídeos automaticamente pelo padrão INES"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ocean px-5 py-3 text-sm font-extrabold text-white shadow-soft"
              href="/admin/add-words"
            >
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
              Adicionar novas palavras
            </Link>
            <ActionButton tone="quiet" onClick={refresh}>
              <RefreshCcw className="h-5 w-5" aria-hidden="true" />
              Atualizar painel
            </ActionButton>
          </>
        }
        visual={<SignCurationIllustration decorative className="h-auto w-full -translate-y-8" />}
      />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <ModeBadge />
            <h2 className="mt-3 text-2xl font-black text-ink dark:text-white">Ferramentas de curadoria</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Acesse importadores controlados, validação de mídia e rotinas de catálogo sem alterar o fluxo de aprovação manual.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-ocean px-4 py-3 text-base font-bold text-white" href="/admin/signs/new">
              Novo sinal INES
            </Link>
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-mint px-4 py-3 text-base font-bold text-ink" href="/admin/import/ines-media">
              Automatizar busca de vídeos INES
            </Link>
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-amber px-4 py-3 text-base font-bold text-ink" href="/admin/media-auto-fill">
              Preencher URLs automaticamente
            </Link>
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-base font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin/ines-standard-video">
              Preencher vídeos INES por padrão
            </Link>
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-base font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin/media-crawler">
              Catálogo de mídias
            </Link>
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-base font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin/ines-catalog">
              Catálogo completo INES
            </Link>
            <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-base font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin/media-validate">
              Testar URL de mídia
            </Link>
            <ActionButton tone="secondary" onClick={runSampleImport}>
              <FileJson className="h-5 w-5" aria-hidden="true" />
              Importar JSON
            </ActionButton>
            <ActionButton tone="quiet" onClick={runCsvImport}>
              <Upload className="h-5 w-5" aria-hidden="true" />
              Importar CSV
            </ActionButton>
            <ActionButton tone="quiet" onClick={runApiImport}>
              <Database className="h-5 w-5" aria-hidden="true" />
              Importar via API
            </ActionButton>
          </div>
        </div>

        <section className="rounded-lg border border-amber/40 bg-amber/15 p-4 shadow-soft dark:border-amber/30" aria-labelledby="add-words-callout">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <LibrasLiveIcon size={62} decorative className="hidden shrink-0 sm:block" />
              <div>
              <h2 id="add-words-callout" className="text-xl font-black text-ink dark:text-white">Quer cadastrar novas palavras?</h2>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/75 dark:text-white/75">
                Use uma entrada simples para cadastrar manualmente, preencher vídeos pelo padrão INES ou importar listas autorizadas. A Liva identifica recursos visuais; sinais reais seguem dependendo de vídeo, GIF ou animação aprovada.
              </p>
              </div>
            </div>
            <Link
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ocean px-4 py-3 text-sm font-black text-white"
              href="/admin/add-words"
            >
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
              Adicionar novas palavras
            </Link>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ["Total de sinais", stats.total_signs],
            ["Sem mídia", stats.no_video_signs ?? 0],
            ["Com vídeo", stats.video_signs ?? stats.approved_with_video_signs ?? 0],
            ["Com GIF", stats.gif_signs ?? 0],
            ["Mídia pendente", stats.pending_with_media_signs ?? stats.pending_with_video_signs ?? 0],
            ["Prontos para Avatar", stats.ready_for_avatar_signs ?? 0],
            ["Precisam de curadoria", stats.needs_curation_signs ?? 0]
          ].map(([label, value]) => (
            <section key={label} className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <p className="text-sm font-bold uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</p>
              <p className="mt-2 text-3xl font-black text-ink dark:text-white">{value}</p>
            </section>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
          <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="mb-4 rounded-lg border border-ocean/15 bg-teal-50 p-4 dark:border-white/10 dark:bg-zinc-800">
              <h2 className="text-lg font-black text-ink dark:text-white">Preencher URLs automaticamente</h2>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">
                A rotina completa roda em tela dedicada, com diagnóstico, lote pequeno, busca INES/IFPR, relatório por palavra e auditoria. Ela não roda em build/deploy.
              </p>
              <Link className="focus-ring mt-3 inline-flex min-h-12 items-center rounded-lg bg-ocean px-4 py-3 text-sm font-bold text-white" href="/admin/media-auto-fill">
                Preencher URLs automaticamente
              </Link>
              <Link className="focus-ring ml-2 mt-3 inline-flex min-h-12 items-center rounded-lg bg-mint px-4 py-3 text-sm font-bold text-ink shadow-soft" href="/admin/ines-catalog">
                Abrir catálogo INES
              </Link>
              <Link className="focus-ring ml-2 mt-3 inline-flex min-h-12 items-center rounded-lg bg-white px-4 py-3 text-sm font-bold text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint" href="/admin/media-crawler">
                Gerar catálogos
              </Link>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-b border-ink/10 pb-4 dark:border-white/10">
              <div className="min-w-52 flex-1">
                <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="word-filter">
                  Filtro por palavra
                </label>
                <input
                  id="word-filter"
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                />
              </div>
              <div className="min-w-48">
                <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="status-filter">
                  Status
                </label>
                <select
                  id="status-filter"
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="approved">Aprovados</option>
                  <option value="pending">Pendentes</option>
                  <option value="review">Revisão</option>
                  <option value="needs_specialist_review">Especialista</option>
                  <option value="rejected">Rejeitados</option>
                </select>
              </div>
              <div className="min-w-48">
                <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="category-filter">
                  Categoria
                </label>
                <select
                  id="category-filter"
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-48">
                <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor="subject-filter">
                  Disciplina
                </label>
                <select
                  id="subject-filter"
                  className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                >
                  <option value="">Todas</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="focus-within:ring-2 focus-within:ring-ocean/60 inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-ink shadow-soft dark:bg-zinc-950 dark:text-white">
                <input
                  className="h-5 w-5 accent-ocean"
                  type="checkbox"
                  checked={inesOnly}
                  onChange={(event) => setInesOnly(event.target.checked)}
                />
                Somente fonte INES
              </label>
              <span className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal-50 px-4 text-sm font-bold text-ocean dark:bg-zinc-800 dark:text-mint">
                <Filter className="h-4 w-4" aria-hidden="true" />
                filtros ativos
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] border-separate border-spacing-y-2 text-left">
                <thead className="text-sm uppercase tracking-normal text-ink/60 dark:text-white/60">
                  <tr>
                    <th className="px-3 py-2">Palavra</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Mídia</th>
                    <th className="px-3 py-2">Fonte</th>
                    <th className="px-3 py-2">Licença</th>
                    <th className="px-3 py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {signs.map((sign) => {
                    const hasAvatarMedia = Boolean(sign.video_url || sign.avatar_video_url || sign.avatar_gif_url || sign.avatar_animation_url);
                    const hasSupportImage = Boolean(sign.image_url);
                    const hasMedia = hasAvatarMedia || hasSupportImage;
                    const mediaHref = sign.avatar_video_url || sign.video_url || sign.avatar_gif_url || sign.avatar_animation_url || sign.image_url || "#";
                    const mediaLabel = sign.avatar_video_url || sign.video_url ? "Com vídeo" : sign.avatar_gif_url ? "Com GIF" : sign.avatar_animation_url ? "Com animação" : sign.image_url ? "Com imagem de apoio" : "Sem mídia";
                    const isInes = sign.source_name?.toLowerCase().includes("ines");
                    return (
                    <tr key={sign.id} className="bg-teal-50 text-sm font-semibold text-ink dark:bg-zinc-800 dark:text-white">
                      <td className="rounded-l-lg px-3 py-3 text-base font-black">{sign.word}</td>
                      <td className="px-3 py-3">
                        <div>{sign.status}</div>
                        {sign.status === "pending" && hasMedia && (
                          <span className="mt-1 inline-flex rounded-full bg-amber/25 px-2 py-1 text-xs font-black text-ink dark:text-white">
                            {hasAvatarMedia ? "Pronto para Avatar após aprovação" : "Apenas imagem de apoio — revisar"}
                          </span>
                        )}
                        {sign.status === "approved" && hasAvatarMedia && (
                          <span className="mt-1 inline-flex rounded-full bg-mint px-2 py-1 text-xs font-black text-ink">
                            Pronto para Avatar
                          </span>
                        )}
                        {sign.status === "approved" && !hasAvatarMedia && hasSupportImage && (
                          <span className="mt-1 inline-flex rounded-full bg-zinc-200 px-2 py-1 text-xs font-black text-ink">
                            Imagem de apoio
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {hasMedia ? (
                          <span className="rounded-full bg-mint px-2 py-1 text-xs font-black text-ink">{mediaLabel}</span>
                        ) : (
                          <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-black text-ink">{mediaLabel}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div>{isInes ? "Dicionário INES" : sign.source_name}</div>
                        {(sign.source_reference_url || sign.source_url) && (
                          <a className="text-ocean underline-offset-4 hover:underline dark:text-mint" href={sign.source_reference_url || sign.source_url || "#"} target="_blank" rel="noreferrer">
                            Abrir fonte
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-3">{sign.license}</td>
                      <td className="rounded-r-lg px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="focus-ring rounded-lg bg-white px-3 py-2 font-bold text-ocean dark:bg-zinc-950 dark:text-mint" onClick={() => selectSign(sign)}>
                            Revisar
                          </button>
                          {hasMedia ? (
                            <a className="focus-ring rounded-lg bg-ocean px-3 py-2 font-bold text-white" href={mediaHref} target="_blank" rel="noreferrer">
                              {hasAvatarMedia ? "Ver mídia" : "Ver apoio visual"}
                            </a>
                          ) : (
                            <button className="focus-ring rounded-lg bg-mint px-3 py-2 font-bold text-ink" onClick={() => prepareInesMedia(sign)}>
                              Adicionar mídia
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <div className="mb-4 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-ocean dark:text-mint" aria-hidden="true" />
                <h2 className="text-xl font-black text-ink dark:text-white">Edição e aprovação</h2>
              </div>
              {selected && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    Palavra
                    <input className="mt-2 w-full rounded-lg border border-ink/15 bg-zinc-100 px-4 py-3 font-black text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={selected.word} disabled />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    Glosa curada
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.gloss ?? ""}
                      onChange={(event) => setSelected({ ...selected, gloss: event.target.value })}
                      placeholder="Preencher apenas com validação de especialista"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-ink dark:bg-zinc-800 dark:text-white">
                      Status: {selected.status}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${selected.video_url || selected.avatar_video_url || selected.avatar_gif_url || selected.avatar_animation_url || selected.image_url ? "bg-mint text-ink" : "bg-zinc-200 text-ink"}`}>
                      {selected.video_url || selected.avatar_video_url ? "Com vídeo" : selected.avatar_gif_url ? "Com GIF" : selected.avatar_animation_url ? "Com animação" : selected.image_url ? "Com imagem de apoio" : "Sem mídia"}
                    </span>
                  </div>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    Fonte
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.source_name ?? ""}
                      onChange={(event) => setSelected({ ...selected, source_name: event.target.value })}
                      placeholder={INES_SOURCE_NAME}
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    URL da fonte
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.source_url ?? ""}
                      onChange={(event) => setSelected({ ...selected, source_url: event.target.value })}
                      placeholder={INES_SOURCE_URL}
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    URL específica do sinal no INES
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.source_reference_url ?? ""}
                      onChange={(event) => setSelected({ ...selected, source_reference_url: event.target.value })}
                      placeholder="Cole a página específica consultada"
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    Licença/autorização
                    <textarea
                      className="focus-ring mt-2 min-h-20 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.license ?? ""}
                      onChange={(event) => setSelected({ ...selected, license: event.target.value })}
                      placeholder={INES_LICENSE}
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    Observações de licença
                    <textarea
                      className="focus-ring mt-2 min-h-20 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.license_notes ?? ""}
                      onChange={(event) => setSelected({ ...selected, license_notes: event.target.value })}
                      placeholder={INES_LICENSE_NOTES}
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    URL do vídeo autorizado
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.video_url ?? ""}
                      onChange={(event) => setSelected({ ...selected, video_url: event.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    URL do avatar/vídeo
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.avatar_video_url ?? ""}
                      onChange={(event) => setSelected({ ...selected, avatar_video_url: event.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    URL do GIF autorizado
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.avatar_gif_url ?? ""}
                      onChange={(event) => setSelected({ ...selected, avatar_gif_url: event.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    URL da imagem autorizada
                    <input
                      className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.image_url ?? ""}
                      onChange={(event) => setSelected({ ...selected, image_url: event.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  {(selected.avatar_video_url || selected.video_url) && (
                    <div className="rounded-lg border border-ocean/20 bg-teal-50 p-3 dark:border-white/10 dark:bg-zinc-800">
                      <p className="mb-2 text-sm font-black text-ink dark:text-white">Prévia do vídeo</p>
                      <video
                        className="aspect-video w-full rounded-lg bg-black"
                        src={selected.avatar_video_url || selected.video_url || undefined}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    </div>
                  )}
                  {selected.avatar_gif_url && (
                    <div className="rounded-lg border border-ocean/20 bg-teal-50 p-3 dark:border-white/10 dark:bg-zinc-800">
                      <p className="mb-2 text-sm font-black text-ink dark:text-white">Prévia do GIF</p>
                      <img
                        className="max-h-64 w-full rounded-lg bg-black object-contain"
                        src={selected.avatar_gif_url}
                        alt={`Prévia do GIF autorizado para ${selected.word}`}
                        loading="lazy"
                        decoding="async"
                      />
                      <p className="mt-2 text-xs font-bold leading-relaxed text-ink/70 dark:text-white/70">
                        GIF é mídia complementar e deve ter fonte/licença registrada. Aprove somente após validação por especialista em Libras.
                      </p>
                    </div>
                  )}
                  {!selected.avatar_video_url && !selected.video_url && !selected.avatar_gif_url && !selected.avatar_animation_url && (
                    <div className="rounded-lg bg-amber/20 p-3 text-sm font-bold leading-relaxed text-ink dark:text-white">
                      {selected.image_url
                        ? "Apenas imagem de apoio cadastrada. Aprovar este sinal nao fara o Avatar Libras exibir traducao animada."
                        : "Sem video/GIF/animacao cadastrado. Aprovar este sinal sem midia animada fara o Avatar Libras manter fallback visual."}
                    </div>
                  )}
                  <div className="rounded-lg border border-ink/10 bg-teal-50 p-3 dark:border-white/10 dark:bg-zinc-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-ink dark:text-white">Validação da mídia animada</p>
                      <ActionButton tone="quiet" onClick={testSelectedMedia}>
                        Testar mídia
                      </ActionButton>
                    </div>
                    {mediaValidation ? (
                      <div className={`mt-3 rounded-lg p-3 text-sm font-bold ${mediaValidation.valid ? "bg-mint/40 text-ink" : "bg-red-100 text-red-950"}`}>
                        <p>Validada: {mediaValidation.valid ? "Sim" : "Não"}</p>
                        <p>Status HTTP: {mediaValidation.status_code ?? "-"}</p>
                        <p>Content-Type: {mediaValidation.content_type ?? "-"}</p>
                        <p className="break-all">URL final: {mediaValidation.final_url || mediaValidation.url}</p>
                        <p>{mediaValidation.reason}</p>
                        {!mediaValidation.valid ? <p className="mt-2 font-black">Esta mídia não carregou corretamente. Não aprove como Avatar.</p> : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-bold text-ink/70 dark:text-white/70">Teste antes de salvar/aprovar URLs novas de vídeo, GIF ou animação.</p>
                    )}
                  </div>
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    Notas do curador
                    <textarea
                      className="focus-ring mt-2 min-h-28 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.curator_notes ?? ""}
                      onChange={(event) => setSelected({ ...selected, curator_notes: event.target.value })}
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <ActionButton tone="quiet" onClick={saveSelected}>
                      Salvar mídia
                    </ActionButton>
                    <ActionButton tone="danger" onClick={rejectSelected}>
                      Reprovar
                    </ActionButton>
                    <ActionButton onClick={approveSelected}>
                      <Check className="h-5 w-5" aria-hidden="true" />
                      Aprovar
                    </ActionButton>
                  </div>
                </div>
              )}
            </section>
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <h2 className="text-xl font-black text-ink dark:text-white">Historico de alteracoes</h2>
              <div className="mt-3 space-y-2 text-sm font-semibold text-ink/70 dark:text-white/70">
                {(auditLog.length ? auditLog : [{ id: 0, action: "Sem histórico carregado", created_at: "" }]).map((item) => (
                  <p key={item.id} className="rounded-lg bg-teal-50 p-3 dark:bg-zinc-800">
                    {item.action} {item.created_at ? `- ${new Date(item.created_at).toLocaleString("pt-BR")}` : ""}
                  </p>
                ))}
              </div>
            </section>
            <div className="rounded-lg bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:text-white">{message}</div>
            <InstitutionalNotice />
          </aside>
        </div>
      </div>
    </main>
  );
}
