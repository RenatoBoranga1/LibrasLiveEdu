"use client";

import { useEffect, useState } from "react";
import type { LiveCaptionStatus } from "@/components/LiveCaption";

export function useCaptionControls({ currentCaption, connected, reconnecting, classEnded }: { currentCaption: string; connected: boolean; reconnecting: boolean; classEnded: boolean }) {
  const [paused, setPaused] = useState(false);
  const [displayCaption, setDisplayCaption] = useState("");

  useEffect(() => {
    if (!paused && currentCaption) setDisplayCaption(currentCaption);
  }, [currentCaption, paused]);

  const status: LiveCaptionStatus = classEnded ? "offline" : reconnecting ? "reconnecting" : paused ? "paused" : displayCaption ? "receiving" : connected ? "waiting" : "offline";
  const text = classEnded
    ? "A aula foi encerrada. Você ainda pode revisar os trechos salvos."
    : reconnecting
      ? "Reconectando à aula. Aguarde um instante..."
      : displayCaption || (connected ? "Aguardando a fala do professor..." : "Aguardando conexão com a aula...");

  return { paused, status, text, togglePause: () => setPaused((value) => !value) };
}
