"use client";

import { useEffect, useMemo, useState } from "react";
import { WS_BASE } from "@/services/api";
import { mapLiveSummary } from "@/services/api";
import type { SignCard, LiveSummary, LiveTranscriptSegment } from "@/types/live";

type TranslationState = {
  status: string;
  glossText?: string | null;
  provider?: string | null;
  providerConfigured?: boolean | null;
  warningMessage?: string | null;
  avatarVideoUrl?: string | null;
  animationPayloadUrl?: string | null;
};

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const demoSegments: LiveTranscriptSegment[] = [
  { id: 1, originalText: "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação.", confidence: 0.98 },
  { id: 2, originalText: "Um sistema usa entrada, processamento e saída para resolver problemas.", confidence: 0.97 },
  { id: 3, originalText: "Na matemática, soma e divisão ajudam a comparar números.", confidence: 0.96 },
];

const demoCards: SignCard[] = [
  { word: "tecnologia", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
  { word: "dados", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
  { word: "sistema", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
];

export function useLiveClass(accessCode: string | null, token?: string | null, role: "student" | "teacher" = "student") {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>([]);
  const [cards, setCards] = useState<SignCard[]>([]);
  const [translation, setTranslation] = useState<TranslationState>({ status: "waiting" });
  const [summary, setSummary] = useState<{ text: string; keywords: string[] } | null>(null);
  const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    if (!accessCode) return;
    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let closedByHook = false;
    let classFinished = false;
    let terminalError = false;
    let attempts = 0;

    const connect = () => {
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
      socket = new WebSocket(`${WS_BASE}/ws/classes/${encodeURIComponent(accessCode)}/${role}${tokenQuery}`);
      socket.onopen = () => {
        attempts = 0;
        setConnected(true);
        setReconnecting(false);
        setConnectionError(null);
      };
      socket.onclose = () => {
        setConnected(false);
        if (closedByHook || classFinished || terminalError) return;
        attempts += 1;
        setReconnecting(true);
        setConnectionError("Conexão interrompida. Tentando reconectar...");
        retryTimer = window.setTimeout(connect, Math.min(1000 * attempts, 6000));
      };
      socket.onerror = () => {
        setConnected(false);
        setConnectionError("Não foi possível conectar ao tempo real agora.");
      };
      socket.onmessage = (message) => {
        let liveEvent: { event: string; payload: Record<string, unknown> };
        try {
          liveEvent = JSON.parse(message.data);
        } catch {
          return;
        }
        if (liveEvent.event === "transcript.segment.created") {
          const segment = liveEvent.payload as LiveTranscriptSegment;
          setSegments((current) => {
            const exists = current.some((item) =>
              segment.id ? item.id === segment.id : (item.originalText ?? item.text) === (segment.originalText ?? segment.text)
            );
            return exists ? current : [segment, ...current].slice(0, 16);
          });
        }
        if (liveEvent.event === "translation.created") {
          setTranslation({
            status: String(liveEvent.payload.status ?? liveEvent.payload.translationStatus ?? "unavailable"),
            glossText: liveEvent.payload.glossText as string | null,
            provider: (liveEvent.payload.providerName ?? liveEvent.payload.provider) as string | null,
            providerConfigured: liveEvent.payload.providerConfigured as boolean | null,
            warningMessage: liveEvent.payload.warningMessage as string | null,
            avatarVideoUrl: liveEvent.payload.avatarVideoUrl as string | null,
            animationPayloadUrl: liveEvent.payload.animationPayloadUrl as string | null,
          });
        }
        if (liveEvent.event === "sign.card.created") {
          const items = (liveEvent.payload.items ?? []) as SignCard[];
          setCards((current) => dedupeCards([...items, ...current]).slice(0, 12));
        }
        if (liveEvent.event === "summary.updated" || liveEvent.event === "summary.created") {
          const nextSummary = mapLiveSummary(liveEvent.payload);
          setLiveSummary(nextSummary);
          setSummary({
            text: nextSummary.summaryText,
            keywords: nextSummary.keywords,
          });
        }
        if (liveEvent.event === "class.finished") {
          classFinished = true;
          setReconnecting(false);
          setConnectionError("Esta aula foi encerrada.");
          socket?.close();
        }
        if (liveEvent.event === "error") {
          const errorMessage = String(liveEvent.payload.message ?? "Erro no tempo real.");
          const normalizedError = errorMessage.toLowerCase();
          if (
            normalizedError.includes("encerrada") ||
            normalizedError.includes("não encontrada") ||
            normalizedError.includes("nao encontrada") ||
            normalizedError.includes("token invalido") ||
            normalizedError.includes("token inválido")
          ) {
            terminalError = true;
            classFinished = true;
            setReconnecting(false);
          }
          setConnectionError(errorMessage);
        }
      };
    };

    connect();

    return () => {
      closedByHook = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [accessCode, role, token]);

  const currentCaption = useMemo(() => segments[0]?.originalText ?? segments[0]?.text ?? "", [segments]);

  function injectDemo() {
    if (!demoMode) return;
    const segment = demoSegments[demoStep % demoSegments.length];
    setSegments((current) => [segment, ...current.filter((item) => item.id !== segment.id)].slice(0, 12));
    setCards(demoCards);
    setTranslation({
      status: "pending",
      glossText: "TECNOLOGIA DADOS SISTEMA",
      provider: "demo",
      providerConfigured: false,
      warningMessage: "Provedor de avatar Libras não configurado. Exibindo legenda e glosa de apoio.",
    });
    setLiveSummary({
      summaryText: "Resumo automático de apoio: a aula está abordando tecnologia, dados e sistema.",
      bulletPoints: [segment.originalText ?? ""].filter(Boolean),
      keywords: ["tecnologia", "dados", "sistema"],
      generatedBy: "local_fallback",
      isAutoGenerated: true,
      updatedAt: new Date().toISOString(),
    });
    setDemoStep((step) => step + 1);
  }

  return {
    connected,
    reconnecting,
    connectionError,
    segments,
    cards,
    currentCaption,
    translation,
    summary,
    liveSummary,
    injectDemo,
  };
}

function dedupeCards(cards: SignCard[]) {
  return cards.filter((item, index, list) => {
    const key = item.id ? `id:${item.id}` : `word:${item.word.toLowerCase()}:${item.status}`;
    return index === list.findIndex((candidate) => {
      const candidateKey = candidate.id
        ? `id:${candidate.id}`
        : `word:${candidate.word.toLowerCase()}:${candidate.status}`;
      return candidateKey === key;
    });
  });
}
