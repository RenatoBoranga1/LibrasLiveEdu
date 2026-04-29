"use client";

import { useEffect, useMemo, useState } from "react";
import { WS_BASE } from "@/services/api";
import type { SignCard, LiveTranscriptSegment } from "@/types/live";

type TranslationState = {
  status: string;
  glossText?: string | null;
  provider?: string | null;
  avatarVideoUrl?: string | null;
  animationPayloadUrl?: string | null;
};

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

const demoSegments: LiveTranscriptSegment[] = [
  { id: 1, originalText: "Bom dia, turma. Hoje vamos estudar tecnologia, dados e informacao.", confidence: 0.98 },
  { id: 2, originalText: "Um sistema usa entrada, processamento e saida para resolver problemas.", confidence: 0.97 },
  { id: 3, originalText: "Na matematica, soma e divisao ajudam a comparar numeros.", confidence: 0.96 },
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
        if (closedByHook) return;
        attempts += 1;
        setReconnecting(true);
        setConnectionError("Conexao interrompida. Tentando reconectar...");
        retryTimer = window.setTimeout(connect, Math.min(1000 * attempts, 6000));
      };
      socket.onerror = () => {
        setConnected(false);
        setConnectionError("Nao foi possivel conectar ao tempo real agora.");
      };
      socket.onmessage = (message) => {
        let liveEvent: { event: string; payload: Record<string, unknown> };
        try {
          liveEvent = JSON.parse(message.data);
        } catch {
          return;
        }
        if (liveEvent.event === "transcript.segment.created") {
          setSegments((current) => [liveEvent.payload as LiveTranscriptSegment, ...current].slice(0, 16));
        }
        if (liveEvent.event === "translation.created") {
          setTranslation({
            status: String(liveEvent.payload.translationStatus ?? "unavailable"),
            glossText: liveEvent.payload.glossText as string | null,
            provider: liveEvent.payload.provider as string | null,
            avatarVideoUrl: liveEvent.payload.avatarVideoUrl as string | null,
            animationPayloadUrl: liveEvent.payload.animationPayloadUrl as string | null,
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
        if (liveEvent.event === "class.finished") {
          setConnectionError("Esta aula foi encerrada.");
          socket?.close();
        }
        if (liveEvent.event === "error") {
          setConnectionError(String(liveEvent.payload.message ?? "Erro no tempo real."));
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
    injectDemo,
  };
}
