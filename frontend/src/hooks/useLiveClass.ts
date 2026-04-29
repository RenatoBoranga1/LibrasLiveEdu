"use client";

import { useEffect, useMemo, useState } from "react";
import { WS_BASE } from "@/services/api";
import type { SignCard, LiveTranscriptSegment } from "@/types/live";

type TranslationState = {
  status: string;
  glossText?: string | null;
  provider?: string | null;
};

const demoSegments: LiveTranscriptSegment[] = [
  { id: 1, originalText: "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informação.", confidence: 0.98 },
  { id: 2, originalText: "Um sistema usa entrada, processamento e saída para resolver problemas.", confidence: 0.97 },
  { id: 3, originalText: "Na matemática, a soma e a divisão ajudam a comparar números.", confidence: 0.96 }
];

const demoCards: SignCard[] = [
  { word: "tecnologia", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
  { word: "dados", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" },
  { word: "sistema", status: "pending", curation: "pending", sourceName: "Seed educacional inicial" }
];

export function useLiveClass(accessCode: string | null) {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [segments, setSegments] = useState<LiveTranscriptSegment[]>([]);
  const [cards, setCards] = useState<SignCard[]>([]);
  const [translation, setTranslation] = useState<TranslationState>({ status: "unavailable" });
  const [summary, setSummary] = useState<{ text: string; keywords: string[] } | null>(null);
  const [demoStep, setDemoStep] = useState(0);

  useEffect(() => {
    if (!accessCode) return;
    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let closedByHook = false;
    let attempts = 0;

    const connect = () => {
      socket = new WebSocket(`${WS_BASE}/ws/classes/${accessCode}`);
      socket.onopen = () => {
        attempts = 0;
        setConnected(true);
        setReconnecting(false);
        setConnectionError(null);
      };
      socket.onclose = () => {
        setConnected(false);
        if (closedByHook) return;
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
        const liveEvent = JSON.parse(message.data) as { event: string; payload: Record<string, unknown> };
        if (liveEvent.event === "transcript.segment.created") {
          setSegments((current) => [liveEvent.payload as LiveTranscriptSegment, ...current].slice(0, 16));
        }
        if (liveEvent.event === "translation.created") {
          setTranslation({
            status: String(liveEvent.payload.translationStatus ?? "unavailable"),
            glossText: liveEvent.payload.glossText as string | null,
            provider: liveEvent.payload.provider as string | null
          });
        }
        if (liveEvent.event === "sign.card.created") {
          const items = (liveEvent.payload.items ?? []) as SignCard[];
          setCards((current) => [...items, ...current].slice(0, 12));
        }
        if (liveEvent.event === "summary.created") {
          setSummary({
            text: String(liveEvent.payload.summaryText ?? ""),
            keywords: (liveEvent.payload.keywords ?? []) as string[],
          });
        }
      };
    };

    connect();

    return () => {
      closedByHook = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [accessCode]);

  const currentCaption = useMemo(() => segments[0]?.originalText ?? segments[0]?.text ?? "", [segments]);

  function injectDemo() {
    const segment = demoSegments[demoStep % demoSegments.length];
    setSegments((current) => [segment, ...current].slice(0, 12));
    setCards(demoCards);
    setTranslation({ status: "unavailable", provider: "demo" });
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
    injectDemo
  };
}
