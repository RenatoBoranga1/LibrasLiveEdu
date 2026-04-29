import { Captions } from "lucide-react";

export function LiveCaption({ text, enlarged }: { text: string; enlarged?: boolean }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-ink p-5 text-white shadow-soft ring-2 ring-mint/20 dark:border-white/10">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-normal text-mint">
        <Captions className="h-5 w-5" aria-hidden="true" />
        Legenda ao vivo
      </div>
      <p
        role="status"
        aria-live="polite"
        className={`${enlarged ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl"} min-h-32 font-black leading-tight`}
      >
        {text || "Aguardando transmissão..."}
      </p>
    </section>
  );
}
