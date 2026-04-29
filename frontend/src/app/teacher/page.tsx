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
import { useRequireRole } from "@/features/auth/AuthProvider";
import { createClass, createSummary, finishClass, listSubjects, pauseClass, sendDemoTick, sendTranscript } from "@/services/api";
import { createBrowserSpeechRecognition } from "@/services/speech";
import type { ClassSession, Subject } from "@/types/live";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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
  const auth = useRequireRole(["professor", "admin"]);
  const [subjects, setSubjects] = useState<Subject[]>(fallbackSubjects);
  const [title, setTitle] = useState(demoMode ? "Aula demo: tecnologia, dados e informação" : "");
  const [subjectId, setSubjectId] = useState<number | null>(fallbackSubjects[0].id);
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [live, setLive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [mobileOrigin, setMobileOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState("");
  const [microphoneStatus, setMicrophoneStatus] = useState("microfone aguardando");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMobileOrigin(process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin);
    listSubjects().then(setSubjects).catch(() => setSubjects(fallbackSubjects));
  }, []);

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === subjectId), [subjects, subjectId]);
  const accessCode = classSession?.access_code ?? (demoMode ? "AULA-4821" : "Aguardando");
  const hasJoinTarget = Boolean(classSession) || demoMode;
  const joinPath = hasJoinTarget
    ? `/join/${accessCode}${classSession?.join_token ? `?token=${encodeURIComponent(classSession.join_token)}` : ""}`
    : "#";
  const joinLink = hasJoinTarget ? `${mobileOrigin || "http://IP-DO-COMPUTADOR:3000"}${joinPath}` : "";
  const needsLanIp = joinLink.includes("localhost") || joinLink.includes("127.0.0.1");
  const statusLabel = live ? "Aula ao vivo" : getClassStatusLabel(classSession);
  const modeLabel = live ? "aula ao vivo" : demoMode ? "modo demonstração" : "aula aguardando início";

  useEffect(() => {
    if (!demoMode || !live || !classSession) return;
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

  async function createNewClass(): Promise<ClassSession | null> {
    setError(null);
    setFeedback(null);
    if (!title.trim()) {
      setError("Informe o título da aula antes de criar a sala.");
      return null;
    }
    setCreating(true);
    setSummary(null);
    setTranscript([]);
    setDemoStep(0);
    try {
      const created = await createClass({ title: title.trim(), subject_id: subjectId });
      setClassSession(created);
      setFeedback("Aula criada com sucesso.");
      return created;
    } catch {
      if (demoMode) {
        const demoSession = { id: 1, title, subject_id: subjectId, access_code: "AULA-4821", status: "active" as const };
        setClassSession(demoSession);
        setFeedback("Aula demo criada.");
        return demoSession;
      }
      setError("Não foi possível criar a aula. Verifique sua conexão ou faça login novamente.");
      return null;
    } finally {
      setCreating(false);
    }
  }

  async function startClass() {
    const session = classSession ?? (await createNewClass());
    if (!session) return;
    setLive(true);
    setClassSession({ ...session, status: "active" });
    setFeedback("Aula iniciada.");
  }

  async function pause() {
    setLive(false);
    if (!classSession) return;
    await pauseClass(classSession.id).catch(() => undefined);
    setClassSession({ ...classSession, status: "paused" });
    setFeedback("Aula pausada.");
  }

  async function finish() {
    setLive(false);
    if (!classSession) return;
    const result = await finishClass(classSession.id).catch(() => {
      if (!demoMode) {
        setError("Não foi possível finalizar a aula agora. Tente novamente.");
        return null;
      }
      return {
        summary: "Resumo demo: a aula abordou tecnologia, dados, sistema, matemática e atividades em grupo.",
        keywords: ["tecnologia", "dados", "sistema"],
        status: "finished",
      };
    });
    if (!result) return;
    setSummary(result.summary);
    setClassSession({ ...classSession, status: "finished" });
    setFeedback("Aula finalizada.");
  }

  async function exportSummary() {
    if (!classSession) return;
    const result = await createSummary(classSession.id).catch(() => {
      if (!demoMode) {
        setError("Não foi possível gerar o resumo agora.");
        return null;
      }
      return { summary: "Resumo demo: a aula abordou conceitos principais e palavras-chave para revisão." };
    });
    if (result) setSummary(result.summary);
  }

  async function sendManualTranscript() {
    if (!classSession || !manualText.trim()) return;
    await sendTranscript(classSession.id, manualText.trim()).catch(() => {
      setError("Não foi possível enviar a transcrição. Verifique a conexão.");
    });
    setTranscript((current) => [manualText.trim(), ...current].slice(0, 16));
    setManualText("");
  }

  function activateMicrophone() {
    const recognition = createBrowserSpeechRecognition();
    if (!recognition) {
      setMicrophoneStatus("reconhecimento de fala indisponível neste navegador");
      return;
    }
    recognition.onstart = () => setMicrophoneStatus("captando áudio");
    recognition.onerror = () => setMicrophoneStatus("erro no microfone");
    recognition.onend = () => setMicrophoneStatus("microfone aguardando");
    recognition.onresult = (event) => {
      setMicrophoneStatus("transcrevendo");
      const transcriptText = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .filter(Boolean)
        .join(" ");
      if (classSession && transcriptText) {
        sendTranscript(classSession.id, transcriptText).catch(() => undefined);
        setTranscript((current) => [transcriptText, ...current].slice(0, 16));
      }
    };
    recognition.start();
  }

  async function copyLink() {
    if (!joinLink) return;
    await navigator.clipboard?.writeText(joinLink);
    setCopied(true);
    setFeedback("Link copiado.");
    window.setTimeout(() => setCopied(false), 2000);
    window.setTimeout(() => setFeedback(null), 2000);
  }

  if (auth.loading || !auth.user) {
    return (
      <main className="min-h-screen bg-paper dark:bg-zinc-950">
        <AppHeader />
        <div role="status" className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-lg bg-white p-6 text-ink shadow-soft dark:bg-zinc-900 dark:text-white">
            <h1 className="text-2xl font-black">Verificando login do professor...</h1>
            <p className="mt-2 font-semibold text-ink/70 dark:text-white/70">
              Se você ainda não entrou, vamos redirecionar para a tela de login.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_1fr]">
        <aside className="space-y-4">
          <ModeBadge label={modeLabel} />
          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-ink dark:text-white">Professor</h1>
                <p className="mt-1 text-sm font-bold text-ocean dark:text-mint">{statusLabel}</p>
              </div>
              <span className="rounded-full bg-ocean/10 px-3 py-1 text-xs font-black text-ocean dark:bg-mint/10 dark:text-mint">
                {auth.user.name}
              </span>
            </div>
            {feedback && <div role="status" className="mt-4 rounded-lg bg-ocean px-3 py-2 text-sm font-bold text-white">{feedback}</div>}
            {error && <div role="alert" className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-900">{error}</div>}
            <label className="mt-5 block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="title">
              Título da aula
            </label>
            <input
              id="title"
              className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Revisão de ciências"
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
              <ActionButton onClick={createNewClass} tone="quiet" disabled={creating}>
                <Plus className="h-5 w-5" aria-hidden="true" />
                {creating ? "Criando aula..." : "Criar nova aula"}
              </ActionButton>
              <ActionButton onClick={startClass} disabled={creating}>
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
                <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">{classSession?.title || title || "Aula sem título"}</h2>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${live ? "bg-ocean text-white" : "bg-amber/20 text-ink dark:text-white"}`}>
                <Mic className="h-4 w-4" aria-hidden="true" />
                {live ? "aula transmitindo" : microphoneStatus}
              </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[260px_1fr]">
              <div className="flex flex-col items-center gap-3">
                {hasJoinTarget ? (
                  <>
                    <QrCode code={accessCode} value={joinLink} />
                    <Link href={joinPath} className="focus-ring rounded-lg text-sm font-bold text-ocean dark:text-mint">
                      Abrir link do aluno
                    </Link>
                  </>
                ) : (
                  <div className="grid min-h-52 w-full place-items-center rounded-lg bg-teal-50 p-4 text-center text-sm font-bold text-ink/70 dark:bg-zinc-800 dark:text-white/70">
                    Crie uma aula para gerar QR Code e link.
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="mobile-origin">
                  Link copiável para o celular
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    id="mobile-origin"
                    className="focus-ring rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                    value={joinLink || "Crie uma aula para gerar o link"}
                    readOnly
                    aria-label="Link copiável para entrada do aluno"
                  />
                  <ActionButton tone="quiet" onClick={copyLink} disabled={!joinLink}>
                    {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                    {copied ? "Copiado" : "Copiar"}
                  </ActionButton>
                </div>
                {needsLanIp && (
                  <p className="mt-3 rounded-lg bg-amber/20 p-3 text-sm font-semibold text-ink dark:text-white">
                    Para o celular acessar pelo QR Code, abra o frontend usando o IP do computador na rede, por exemplo
                    http://192.168.0.10:3000.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-ink dark:text-white">Entrada de fala</h2>
                <p className="mt-1 text-sm font-semibold text-ink/65 dark:text-white/65">
                  O app envia apenas texto transcrito. Áudio bruto não é armazenado por padrão.
                </p>
              </div>
              <ActionButton tone="quiet" onClick={activateMicrophone} disabled={!classSession}>
                <Mic className="h-5 w-5" aria-hidden="true" />
                Ativar microfone
              </ActionButton>
            </div>
            <label className="mt-4 block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="manual-transcript">
              Texto manual para teste ou apoio
            </label>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <textarea
                id="manual-transcript"
                className="focus-ring min-h-24 rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                placeholder="Digite um trecho da explicação para enviar aos alunos"
              />
              <ActionButton onClick={sendManualTranscript} disabled={!classSession || !manualText.trim()}>
                Enviar
              </ActionButton>
            </div>
          </section>

          <section className="rounded-lg bg-ink p-5 text-white shadow-soft">
            <p className="text-sm font-bold uppercase tracking-normal text-mint">Transcrição em tempo real</p>
            <div className="mt-4 space-y-3">
              {(transcript.length ? transcript : ["A transcrição aparecerá aqui ao iniciar a aula."]).map((line, index) => (
                <p key={`${line}-${index}`} className="rounded-lg bg-white/10 p-3 text-lg font-semibold leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </section>

          {summary && (
            <section className="rounded-lg border border-amber/30 bg-amber/20 p-4 text-sm font-semibold leading-relaxed text-ink dark:text-white">
              {summary}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function getClassStatusLabel(classSession: ClassSession | null) {
  if (!classSession) return "Sem aula criada";
  if (classSession.status === "paused") return "Aula pausada";
  if (classSession.status === "finished") return "Aula finalizada";
  return "Aula criada";
}
