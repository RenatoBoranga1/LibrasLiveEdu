"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Database, FileJson, Filter, Pencil, RefreshCcw, Upload } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { ModeBadge } from "@/components/ModeBadge";
import {
  approveSign,
  getAdminStats,
  importSampleCsv,
  importSampleJson,
  importViaApi,
  listCategories,
  listSigns,
  listSubjects,
  updateSign
} from "@/services/api";
import type { AdminStats, SignCategory, SignRecord, Subject } from "@/types/live";

const fallbackStats: AdminStats = {
  total_signs: 180,
  approved_signs: 0,
  pending_signs: 180,
  rejected_signs: 0,
  review_signs: 0,
  import_jobs: 1
};

const fallbackSigns: SignRecord[] = [
  { id: 1, word: "professor", normalized_word: "professor", status: "pending", source_name: "Seed educacional inicial", license: "Aguardando curadoria", curator_notes: "Registro inicial para curadoria por especialista em Libras" },
  { id: 2, word: "tecnologia", normalized_word: "tecnologia", status: "pending", source_name: "Seed educacional inicial", license: "Aguardando curadoria", curator_notes: "Registro inicial para curadoria por especialista em Libras" },
  { id: 3, word: "energia", normalized_word: "energia", status: "pending", source_name: "Seed educacional inicial", license: "Aguardando curadoria", curator_notes: "Registro inicial para curadoria por especialista em Libras" }
];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats>(fallbackStats);
  const [signs, setSigns] = useState<SignRecord[]>(fallbackSigns);
  const [word, setWord] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [categories, setCategories] = useState<SignCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<SignRecord | null>(fallbackSigns[0]);
  const [message, setMessage] = useState("Modo demo ativo: dados locais aparecem se a API estiver offline.");

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (word) search.set("word", word);
    if (status) search.set("status", status);
    if (categoryId) search.set("category_id", categoryId);
    if (subjectId) search.set("subject_id", subjectId);
    return search;
  }, [word, status, categoryId, subjectId]);

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
    const updated = await approveSign(selected.id).catch(() => ({ ...selected, status: "approved" }));
    setSelected(updated);
    setSigns((current) => current.map((sign) => (sign.id === updated.id ? updated : sign)));
  }

  async function saveSelected() {
    if (!selected) return;
    const updated = await updateSign(selected.id, {
      gloss: selected.gloss,
      curator_notes: selected.curator_notes,
      status: selected.status
    }).catch(() => selected);
    setSelected(updated);
    setSigns((current) => current.map((sign) => (sign.id === updated.id ? updated : sign)));
    setMessage("Registro salvo para revisão. Confirme fonte e licença antes da aprovação.");
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

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <ModeBadge />
            <h1 className="mt-3 text-3xl font-black text-ink dark:text-white">Administração de sinais</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton tone="quiet" onClick={refresh}>
              <RefreshCcw className="h-5 w-5" aria-hidden="true" />
              Atualizar
            </ActionButton>
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Total", stats.total_signs],
            ["Aprovados", stats.approved_signs],
            ["Pendentes", stats.pending_signs],
            ["Revisão", stats.review_signs],
            ["Rejeitados", stats.rejected_signs]
          ].map(([label, value]) => (
            <section key={label} className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <p className="text-sm font-bold uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</p>
              <p className="mt-2 text-3xl font-black text-ink dark:text-white">{value}</p>
            </section>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
          <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900">
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
              <span className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal-50 px-4 text-sm font-bold text-ocean dark:bg-zinc-800 dark:text-mint">
                <Filter className="h-4 w-4" aria-hidden="true" />
                filtros ativos
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left">
                <thead className="text-sm uppercase tracking-normal text-ink/60 dark:text-white/60">
                  <tr>
                    <th className="px-3 py-2">Palavra</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Fonte</th>
                    <th className="px-3 py-2">Licença</th>
                    <th className="px-3 py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {signs.map((sign) => (
                    <tr key={sign.id} className="bg-teal-50 text-sm font-semibold text-ink dark:bg-zinc-800 dark:text-white">
                      <td className="rounded-l-lg px-3 py-3 text-base font-black">{sign.word}</td>
                      <td className="px-3 py-3">{sign.status}</td>
                      <td className="px-3 py-3">{sign.source_name}</td>
                      <td className="px-3 py-3">{sign.license}</td>
                      <td className="rounded-r-lg px-3 py-3">
                        <button className="focus-ring rounded-lg bg-white px-3 py-2 font-bold text-ocean dark:bg-zinc-950 dark:text-mint" onClick={() => setSelected(sign)}>
                          Revisar
                        </button>
                      </td>
                    </tr>
                  ))}
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
                  <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
                    Notas do curador
                    <textarea
                      className="focus-ring mt-2 min-h-28 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                      value={selected.curator_notes ?? ""}
                      onChange={(event) => setSelected({ ...selected, curator_notes: event.target.value })}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton tone="quiet" onClick={saveSelected}>
                      Salvar
                    </ActionButton>
                    <ActionButton onClick={approveSelected}>
                      <Check className="h-5 w-5" aria-hidden="true" />
                      Aprovar
                    </ActionButton>
                  </div>
                </div>
              )}
            </section>
            <div className="rounded-lg bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:text-white">{message}</div>
            <InstitutionalNotice />
          </aside>
        </div>
      </div>
    </main>
  );
}
