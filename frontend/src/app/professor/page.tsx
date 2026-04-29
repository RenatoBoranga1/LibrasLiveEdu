"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Captions, FileDown, Mic, Pause, Play, Square, Wifi } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { ModeBadge } from "@/components/ModeBadge";
import { QrCode } from "@/components/QrCode";
import { API_BASE, createClass, finishClass, listSubjects, pauseClass, sendDemoTick } from "@/services/api";
import type { ClassSession, Subject } from "@/types/live";

const fallbackSubjects: Subject[] = [
  { id: 1, name: "Tecnologia" },
  { id: 2, name: "Matemática" },
  { id: 3, name: "Ciências" }
];

const localDemoLines = [
  "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação.",
  "Um sistema usa entrada, processamento e saída para resolver problemas.",
  "Na matemática, a soma e a divisão ajudam a comparar números.",
  "No final da aula faremos uma atividade em grupo."
];

export default function ProfessorPage() {
  const [subjects, setSubjects] = useState<Subject[]>(fallbackSubjects);
  const [title, setTitle] = useState("Aula demo: tecnologia, dados e informação");
  const [subjectId, setSubjectId] = useState<number | null>(fallbackSubjects[0].id);
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [live, setLive] = useState(false);
  const [step, setStep] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => setSubjects(fallbackSubjects));
  }, []);

  useEffect(() => {
    if (!live || !classSession) return;
    const timer = window.setInterval(() => {
      sendDemoTick(classSession.id, step)
        .then((result) => {
          setTranscript((current) => [result.line, ...current].slice(0, 12));
          setStep((current) => current + 1);
        })
        .catch(() => {
          const line = localDemoLines[step % localDemoLines.length];
          setTranscript((current) => [line, ...current].slice(0, 12));
          setStep((current) => current + 1);
        });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [classSession, live, step]);

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId), [subjects, subjectId]);

  async function startClass() {
    if (!classSession) {
      try {
        const created = await createClass({ title, subject_id: subjectId });
        setClassSession(created);
      } catch {
        setClassSession({
          id: 1,
          title,
          subject_id: subjectId,
          access_code: "AULA-4821",
          status: "active"
        });
      }
    }
    setLive(true);
  }

  async function pause() {
    setLive(false);
    if (classSession) await pauseClass(classSession.id).catch(() => undefined);
  }

  async function finish() {
    setLive(false);
    if (!classSession) return;
    const result = await finishClass(classSession.id).catch(() => ({
      summary: "Resumo demo: a aula abordou tecnologia, dados, sistema, matemática e atividades em grupo.",
      status: "finished",
      keywords: ["tecnologia", "dados", "sistema"]
    }));
    setSummary(result.summary);
    setClassSession({ ...classSession, status: "finished" });
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-4">
          <ModeBadge />
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h1 className="text-2xl font-black text-ink dark:text-white">Painel do professor</h1>
            <label className="mt-5 block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="title">
              Título da aula
            </label>
            <input
              id="title"
              className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <label className="mt-4 block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="subject">
              Disciplina
            </label>
            <select
              id="subject"
              className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
              value={subjectId ?? ""}
              onChange={(event) => setSubjectId(Number(event.target.value))}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <div className="mt-5 grid gap-3">
              <ActionButton onClick={startClass}>
                <Play className="h-5 w-5" aria-hidden="true" />
                Iniciar transmissão
              </ActionButton>
              <div className="grid grid-cols-2 gap-3">
                <ActionButton tone="quiet" onClick={pause} disabled={!classSession}>
                  <Pause className="h-5 w-5" aria-hidden="true" />
                  Pausar
                </ActionButton>
                <ActionButton tone="danger" onClick={finish} disabled={!classSession}>
                  <Square className="h-5 w-5" aria-hidden="true" />
                  Finalizar
                </ActionButton>
              </div>
              {classSession && (
                <a
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-3 font-bold text-ink dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  href={`${API_BASE}/api/classes/${classSession.id}/export.pdf`}
                >
                  <FileDown className="h-5 w-5" aria-hidden="true" />
                  Exportar PDF
                </a>
              )}
            </div>
          </section>
          <InstitutionalNotice />
        </aside>

        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
            <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-normal text-ocean dark:text-mint">
                    {selectedSubject?.name ?? "Disciplina"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{classSession?.title ?? title}</h2>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${live ? "bg-ocean text-white" : "bg-amber/20 text-ink dark:text-white"}`}>
                  {live ? <Mic className="h-4 w-4" aria-hidden="true" /> : <Wifi className="h-4 w-4" aria-hidden="true" />}
                  {live ? "microfone ativo" : "aguardando"}
                </span>
              </div>
              <div className="mt-6 rounded-lg bg-ink p-5 text-white">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-normal text-mint">
                  <Captions className="h-5 w-5" aria-hidden="true" />
                  Transcrição em tempo real
                </div>
                <div className="space-y-3">
                  {(transcript.length ? transcript : ["A transcrição simulada aparecerá aqui ao iniciar a transmissão."]).map((line, index) => (
                    <p key={`${line}-${index}`} className="rounded-lg bg-white/10 p-3 text-lg font-semibold leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              {summary && (
                <div className="mt-4 rounded-lg bg-amber/15 p-4 text-sm font-semibold leading-relaxed text-ink dark:text-white">
                  {summary}
                </div>
              )}
            </section>
            <div className="flex flex-col items-center gap-3">
              <QrCode code={classSession?.access_code ?? "AULA-4821"} />
              <Link href={`/join/${classSession?.access_code ?? "AULA-4821"}`} className="focus-ring rounded-lg text-sm font-bold text-ocean dark:text-mint">
                Abrir tela do aluno
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
