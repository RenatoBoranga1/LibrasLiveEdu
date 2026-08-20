"use client";

import { Captions, Pause, Play } from "lucide-react";

export type LiveCaptionStatus = "waiting" | "receiving" | "reconnecting" | "offline" | "paused";
export type LiveCaptionSize = "regular" | "large" | "extra-large";

const statusLabels: Record<LiveCaptionStatus, string> = {
  waiting: "Aguardando fala",
  receiving: "Recebendo legenda",
  reconnecting: "Reconectando",
  offline: "Sem conexão",
  paused: "Legenda pausada",
};

const sizeClasses: Record<LiveCaptionSize, string> = {
  regular: "text-3xl",
  large: "text-4xl",
  "extra-large": "text-5xl",
};

export function LiveCaption({
  text,
  size = "large",
  status = "waiting",
  paused = false,
  onTogglePause,
}: {
  text: string;
  size?: LiveCaptionSize;
  status?: LiveCaptionStatus;
  paused?: boolean;
  onTogglePause?: () => void;
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-elevated ring-2 ring-mint/25 dark:border-white/15 sm:p-6" aria-label="Legenda ao vivo">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-mint">
            <Captions className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-black">Legenda ao vivo</h2>
            <p className="text-sm font-semibold text-white/70">A fala do professor aparece aqui.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white" role="status" aria-live="polite">
            <span className={`h-2.5 w-2.5 rounded-full ${status === "receiving" ? "bg-mint-strong" : status === "offline" ? "bg-coral" : "bg-amber"}`} aria-hidden="true" />
            {statusLabels[status]}
          </span>
          {onTogglePause && (
            <button
              type="button"
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-ocean"
              onClick={onTogglePause}
              aria-label={paused ? "Retomar legenda ao vivo" : "Pausar legenda ao vivo"}
            >
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? "Retomar" : "Pausar"}
            </button>
          )}
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={`${sizeClasses[size]} min-h-24 break-words font-black leading-tight [overflow-wrap:anywhere]`}
      >
        {text || "Aguardando transmissão..."}
      </p>
    </section>
  );
}
