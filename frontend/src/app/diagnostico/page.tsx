"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Mic, XCircle } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { API_BASE } from "@/services/api";

type DiagnosticStatus = "ok" | "warning" | "failed";

type DiagnosticItem = {
  label: string;
  status: DiagnosticStatus;
  message: string;
};

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function DiagnosticPage() {
  const [health, setHealth] = useState<DiagnosticItem>({
    label: "GET /api/health",
    status: "warning",
    message: "Verificando API...",
  });
  const [subjects, setSubjects] = useState<DiagnosticItem>({
    label: "GET /api/subjects",
    status: "warning",
    message: "Verificando disciplinas...",
  });
  const [categories, setCategories] = useState<DiagnosticItem>({
    label: "GET /api/categories",
    status: "warning",
    message: "Verificando categorias...",
  });
  const [microphone, setMicrophone] = useState<DiagnosticItem>({
    label: "Microfone",
    status: "warning",
    message: "Permissão ainda não solicitada.",
  });
  const [browserItems, setBrowserItems] = useState<DiagnosticItem[]>([
    {
      label: "NEXT_PUBLIC_API_URL",
      status: configuredApiUrl ? "ok" : "warning",
      message: configuredApiUrl ? configuredApiUrl : `Usando fallback local: ${API_BASE}`,
    },
  ]);

  useEffect(() => {
    runFetchCheck("/api/health", "GET /api/health").then(setHealth);
    runFetchCheck("/api/subjects", "GET /api/subjects").then(setSubjects);
    runFetchCheck("/api/categories", "GET /api/categories").then(setCategories);
    const speechWindow = window as typeof window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    const standalone =
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setBrowserItems([
      {
        label: "NEXT_PUBLIC_API_URL",
        status: configuredApiUrl ? "ok" : "warning",
        message: configuredApiUrl ? configuredApiUrl : `Usando fallback local: ${API_BASE}`,
      },
      {
        label: "WebSocket",
        status: "WebSocket" in window ? "ok" : "failed",
        message: "WebSocket" in window ? "Navegador suporta tempo real." : "Este navegador não suporta WebSocket.",
      },
      {
        label: "SpeechRecognition",
        status: speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition ? "ok" : "warning",
        message:
          speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
            ? "Reconhecimento de fala do navegador disponível."
            : "Reconhecimento de fala do navegador indisponível. Use texto manual ou provider externo.",
      },
      {
        label: "PWA",
        status: standalone ? "ok" : "warning",
        message: standalone ? "App rodando como PWA instalado." : "App rodando no navegador.",
      },
      {
        label: "MediaDevices",
        status: navigator.mediaDevices?.getUserMedia ? "ok" : "failed",
        message: navigator.mediaDevices?.getUserMedia
          ? "O navegador permite solicitar microfone."
          : "Este navegador não permite solicitar microfone.",
      },
    ]);
  }, []);

  async function testMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophone({
        label: "Microfone",
        status: "failed",
        message: "Este navegador não permite solicitar microfone.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophone({
        label: "Microfone",
        status: "ok",
        message: "Permissão concedida e microfone acessível.",
      });
    } catch {
      setMicrophone({
        label: "Microfone",
        status: "warning",
        message: "Permissão negada ou microfone indisponível neste momento.",
      });
    }
  }

  const items = [health, subjects, categories, ...browserItems, microphone];

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-ocean dark:text-mint">Diagnóstico</p>
            <h1 className="mt-1 text-3xl font-black text-ink dark:text-white">Status técnico do LibrasLive Edu</h1>
            <p className="mt-2 max-w-2xl font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Use esta página para validar API, WebSocket, PWA, fala do navegador e microfone antes de demonstrar uma aula.
            </p>
          </div>
          <ActionButton tone="quiet" onClick={testMicrophone}>
            <Mic className="h-5 w-5" aria-hidden="true" />
            Testar microfone
          </ActionButton>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <DiagnosticCard key={item.label} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}

async function runFetchCheck(path: string, label: string): Promise<DiagnosticItem> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!response.ok) {
      return { label, status: "failed", message: `Falhou com HTTP ${response.status}.` };
    }
    return { label, status: "ok", message: "Resposta recebida com sucesso." };
  } catch {
    return { label, status: "failed", message: "Não foi possível acessar a API." };
  }
}

function DiagnosticCard({ item }: { item: DiagnosticItem }) {
  const Icon = item.status === "ok" ? CheckCircle2 : item.status === "warning" ? AlertTriangle : XCircle;
  const badge = item.status === "ok" ? "OK" : item.status === "warning" ? "Atenção" : "Falhou";
  const colors =
    item.status === "ok"
      ? "bg-ocean text-white"
      : item.status === "warning"
        ? "bg-amber text-ink"
        : "bg-red-700 text-white";
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-ocean dark:text-mint" aria-hidden="true" />
          <h2 className="text-lg font-black text-ink dark:text-white">{item.label}</h2>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${colors}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">{item.message}</p>
    </article>
  );
}
