"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ActionButton } from "./ActionButton";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function AddToHomeScreen() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  if (!promptEvent) {
    return (
      <div className="rounded-lg border border-ocean/20 bg-white p-3 text-sm font-semibold leading-relaxed text-ink shadow-soft dark:border-white/10 dark:bg-zinc-900 dark:text-white">
        Android/Chrome: toque nos tres pontos e depois em Adicionar a tela inicial. iPhone/Safari: toque em
        Compartilhar e depois em Adicionar a Tela de Inicio.
      </div>
    );
  }

  return (
    <ActionButton
      tone="secondary"
      onClick={async () => {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        setPromptEvent(null);
      }}
      aria-label="Adicionar LibrasLive Edu a tela inicial"
    >
      <Download className="h-5 w-5" aria-hidden="true" />
      Adicionar a tela inicial
    </ActionButton>
  );
}
