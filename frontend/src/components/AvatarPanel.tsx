import { Hand, VideoOff } from "lucide-react";

export function AvatarPanel({
  status,
  glossText,
  avatarVideoUrl,
  animationPayloadUrl,
  large = false,
}: {
  status: string;
  glossText?: string | null;
  avatarVideoUrl?: string | null;
  animationPayloadUrl?: string | null;
  large?: boolean;
}) {
  return (
    <section
      className={`rounded-lg border border-ocean/20 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900 ${
        large ? "min-h-72" : "min-h-56"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink dark:text-white">Avatar Libras</h2>
        <span className="rounded-full bg-ocean/10 px-3 py-1 text-xs font-bold uppercase tracking-normal text-ocean dark:bg-mint/10 dark:text-mint">
          {avatarVideoUrl ? "video" : status === "success" ? "glosa tecnica" : "fallback visual"}
        </span>
      </div>
      <div className="grid min-h-44 place-items-center rounded-lg bg-teal-50 p-4 dark:bg-zinc-800">
        {avatarVideoUrl ? (
          <video className="max-h-72 w-full rounded-lg" src={avatarVideoUrl} controls playsInline aria-label="Video de avatar em Libras" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-ocean text-white">
              {status === "success" || animationPayloadUrl ? <Hand className="h-12 w-12" aria-hidden="true" /> : <VideoOff className="h-12 w-12" aria-hidden="true" />}
            </div>
            <p className="max-w-md text-sm font-semibold text-ink/75 dark:text-white/75">
              {animationPayloadUrl
                ? "Payload de animacao recebido. Renderer de avatar real deve ser conectado aqui."
                : glossText
                  ? `Glosa tecnica recebida: ${glossText}`
                  : "Nenhum avatar oficial configurado para este trecho. A legenda continua ativa."}
            </p>
          </div>
        )}
      </div>
      <p className="mt-3 rounded-lg bg-amber/15 p-3 text-xs font-bold leading-relaxed text-ink/75 dark:text-white/75">
        Traducao automatica pode conter limitacoes. Consulte interprete ou educador quando necessario.
      </p>
    </section>
  );
}
