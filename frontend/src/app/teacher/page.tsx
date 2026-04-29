"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, FileDown, Mic, Pause, Play, Plus, Square } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { ModeBadge } from "@/components/ModeBadge";
import { QrCode } from "@/components/QrCode";
import { API_BASE, createClass, createSummary, finishClass, listSubjects, pauseClass, sendDemoTick } from "@/services/api";
import type { ClassSession, Subject } from "@/types/live";

const fallbackSubjects: Subject[] = [
  { id: 1, name: "Tecnologia" },
  { id: 2, name: "Matemática" },
  { id: 3, name: "Ciências" },
];

const fallbackLines = [
  "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação.",
  "Um sistema usa entrada, processamento e saída para resolver problemas.",
  "Na matemática, a soma e a divisão ajudam a comparar números.",
  "No final da aula faremos uma atividade em grupo.",
];

export default function TeacherPage() {
  const [subjects, setSubjects] = useState<Subject[]>(fallbackSubjects);
  const [title, setTitle] = useState("Aula demo: tecnologia, dados e informação");
  const [subjectId, setSubjectId] = useState<number | null>(fallbackSubjects[0].id);
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [live, setLive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [mobileOrigin, setMobileOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMobileOrigin(process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin);
    listSubjects().then(setSubjects).catch(() => setSubjects(fallbackSubjects));
  }, []);

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId), [subjects, subjectId]);
  const accessCode = classSession?.access_code ?? "AULA-4821";
  const joinPath = `/join/${accessCode}`;
  const joinLink = `${mobileOrigin || "http://IP-DO-COMPUTADOR:3000"}${joinPath}`;
  const needsLanIp = joinLink.includes("localhost") || joinLink.includes("127.0.0.1");

  useEffect(() => {
    if (!live || !classSession) return;
    const timer = window.setInterval(async () => {
      try {
        const result = await sendDemoTick(classSession.id, demoStep);
        setTranscript((current) => [result.line, ...current].slice(0, 16));
      } catch {
        const line = fallbackLines[demoStep % fallbackLines.length];
        setTranscript((current) => [line, ...current].slice(0, 16));
      } finally {
        setDemoStep((current) => current + 1);
      }
    }, 4200);
    return () => window.clearInterval(timer);
  }, [classSession, demoStep, live]);

  async function createNewClass() {
    setSummary(null);
    setTranscript([]);
    setDemoStep(0);
    try {
      const created = await createClass({ title, subject_id: subjectId });
      setClassSession(created);
    } catch {
      setClassSession({ id: 1, title, subject_id: subjectId, access_code: "AULA-4821", status: "active" });
    }
  }

  async function startClass() {
    if (!classSession) {
      await createNewClass();
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
      keywords: ["tecnologia", "dados", "sistema"],
      status: "finished",
    }));
    setSummary(result.summary);
    setClassSession({ ...classSession, status: "finished" });
  }

  async function exportSummary() {
    if (!classSession) return;
    const result = await createSummary(classSession.id).catch(() => ({
      summary: "Resumo demo: a aula abordou conceitos principais e palavras-chave para revisão.",
    }));
    setSummary(result.summary);
  }

  async function copyLink() {
    await navigator.clipboard?.writeText(joinLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_1fr]">
        <aside className="space-y-4">
          <ModeBadge label={live ? "aula ao vivo" : "modo demonstração"} />
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h1 className="text-2xl font-black text-ink dark:text-white">Professor</h1>
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
              <ActionButton onClick={createNewClass} tone="quiet">
                <Plus className="h-5 w-5" aria-hidden="true" />
                Criar nova aula
              </ActionButton>
              <ActionButton onClick={startClass}>
                <Play className="h-5 w-5" aria-hidden="true" />
                Iniciar aula
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
              <ActionButton tone="secondary" onClick={exportSummary} disabled={!classSession}>
                <FileDown className="h-5 w-5" aria-hidden="true" />
                Exportar resumo
              </ActionButton>
            </div>
          </section>
          <AddToHomeScreen />
          <InstitutionalNotice />
        </aside>

        <section className="space-y-4">
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-ocean dark:text-mint">
                  {selectedSubject?.name ?? "Disciplina"}
                </p>
                <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{classSession?.title ?? title}</h2>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${live ? "bg-ocean text-white" : "bg-amber/20 text-ink dark:text-white"}`}>
                <Mic className="h-4 w-4" aria-hidden="true" />
                {live ? "microfone ativo" : "microfone aguardando"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[260px_1fr]">
              <div className="flex flex-col items-center gap-3">
                <QrCode code={accessCode} value={joinLink} />
                <Link href={joinPath} className="focus-ring rounded-lg text-sm font-bold text-ocean dark:text-mint">
                  Abrir link do aluno
                </Link>
              </div>
              <div>
                <label className="block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="mobile-origin">
                  Link copiável para o celular
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    id="mobile-origin"
                    className="focus-ring rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                    value={joinLink}
                    readOnly
                    aria-label="Link copiável para entrada do aluno"
                  />
                  <ActionButton tone="quiet" onClick={copyLink}>
                    {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                    {copied ? "Copiado" : "Copiar"}
                  </ActionButton>
                </div>
                {needsLanIp && (
                  <p className="mt-3 rounded-lg bg-amber/15 p-3 text-sm font-semibold text-ink dark:text-white">
                    Para o celular acessar pelo QR Code, abra o frontend usando o IP do computador na rede, por exemplo
                    http://192.168.0.10:3000.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg bg-ink p-5 text-white shadow-soft">
            <p className="text-sm font-bold uppercase tracking-normal text-mint">Transcrição em tempo real</p>
            <div className="mt-4 space-y-3">
              {(transcript.length ? transcript : ["A transcrição simulada aparecerá aqui ao iniciar a aula."]).map((line, index) => (
                <p key={`${line}-${index}`} className="rounded-lg bg-white/10 p-3 text-lg font-semibold leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </section>

          {summary && (
            <section className="rounded-lg border border-amber/30 bg-amber/15 p-4 text-sm font-semibold leading-relaxed text-ink dark:text-white">
              {summary}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
