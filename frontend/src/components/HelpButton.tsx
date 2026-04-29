"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint"
        onClick={() => setOpen(true)}
        aria-label="Abrir ajuda"
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
        Ajuda
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4 sm:place-items-center" role="dialog" aria-modal="true" aria-label="Ajuda da aula">
          <section className="w-full max-w-md rounded-lg bg-white p-5 text-ink shadow-soft dark:bg-zinc-900 dark:text-white">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Ajuda rapida</h2>
              <button className="focus-ring rounded-lg p-2" onClick={() => setOpen(false)} aria-label="Fechar ajuda">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm font-semibold leading-relaxed">
              <p>A legenda continua aparecendo mesmo quando o avatar não está disponível.</p>
              <p>Cards pendentes não são sinais oficiais. Eles aguardam curadoria de especialista em Libras.</p>
              <p>Use Fonte grande, Alto contraste ou Modo foco para facilitar a leitura.</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
