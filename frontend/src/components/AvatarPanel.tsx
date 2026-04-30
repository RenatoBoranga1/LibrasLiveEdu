import { BadgeCheck, Box, Hand, Info, Sparkles, VideoOff } from "lucide-react";
import { resolveAvatarState } from "@/services/avatarProvider";
import type { SignCard } from "@/types/live";

export function AvatarPanel({
  status,
  glossText,
  avatarVideoUrl,
  videoUrl,
  animationPayloadUrl,
  sourceName,
  license,
  providerConfigured,
  warningMessage,
  cards = [],
  large = false,
}: {
  status: string;
  glossText?: string | null;
  avatarVideoUrl?: string | null;
  videoUrl?: string | null;
  animationPayloadUrl?: string | null;
  sourceName?: string | null;
  license?: string | null;
  providerConfigured?: boolean | null;
  warningMessage?: string | null;
  cards?: SignCard[];
  large?: boolean;
}) {
  const avatarState = resolveAvatarState({
    status,
    glossText,
    avatarVideoUrl,
    videoUrl,
    animationPayloadUrl,
    providerConfigured,
    warningMessage,
    cards,
  });
  const StatusIcon = avatarState.canRenderAvatar ? BadgeCheck : avatarState.type === "animation" ? Box : VideoOff;
  const playableVideoUrl = avatarVideoUrl || videoUrl;

  return (
    <section
      className={`overflow-hidden rounded-lg border border-ocean/20 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900 ${
        large ? "min-h-72" : "min-h-56"
      }`}
      aria-label="Avatar Libras"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 dark:border-white/10">
        <div>
          <h2 className="text-lg font-black text-ink dark:text-white">Avatar Libras</h2>
          <p className="text-xs font-bold text-ink/60 dark:text-white/60">apoio visual, legenda sempre ativa</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-ocean/10 px-3 py-1 text-xs font-black text-ocean dark:bg-mint/10 dark:text-mint">
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
          {avatarState.label}
        </span>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
        <div className="relative grid min-h-56 place-items-center overflow-hidden rounded-lg bg-ink text-white">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/25 px-3 py-2 text-xs font-bold">
            <span>{avatarState.canRenderAvatar ? "player do avatar" : "área do avatar"}</span>
            <span>{status || "aguardando"}</span>
          </div>

          {playableVideoUrl ? (
            <video
              className="h-full max-h-80 w-full rounded-lg object-contain"
              src={playableVideoUrl}
              controls
              playsInline
              preload="metadata"
              aria-label={avatarVideoUrl ? "Vídeo de avatar em Libras" : "Vídeo de apoio do sinal"}
            />
          ) : (
            <div className="flex max-w-md flex-col items-center gap-4 px-5 py-10 text-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-mint text-ink shadow-soft">
                {avatarState.type === "animation" ? (
                  <Box className="h-12 w-12" aria-hidden="true" />
                ) : avatarState.type === "gloss" ? (
                  <Hand className="h-12 w-12" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-12 w-12" aria-hidden="true" />
                )}
              </div>
              <p className="text-base font-black leading-relaxed">{avatarState.message}</p>
              <p className="text-sm font-semibold leading-relaxed text-white/75">
                A legenda está ativa. O avatar será exibido quando houver sinal aprovado ou provedor configurado.
              </p>
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3">
          {animationPayloadUrl && (
            <div role="status" className="rounded-lg bg-ocean/10 p-3 text-sm font-bold leading-relaxed text-ink dark:bg-mint/10 dark:text-white">
              Dados de animação recebidos. Conecte um renderer 3D para exibir o avatar.
            </div>
          )}

          {glossText && (
            <div className="rounded-lg border border-ink/10 bg-teal-50 p-3 dark:border-white/10 dark:bg-zinc-800">
              <h3 className="text-sm font-black text-ink dark:text-white">Glosa técnica</h3>
              <p className="mt-2 text-lg font-black tracking-normal text-ocean dark:text-mint">{glossText}</p>
            </div>
          )}

          {(sourceName || license) && (
            <div className="rounded-lg bg-white p-3 text-xs font-bold leading-relaxed text-ink/75 shadow-soft dark:bg-zinc-950 dark:text-white/75">
              {sourceName && <p>Fonte: {sourceName}</p>}
              {license && <p className="mt-1">Licença: {license}</p>}
            </div>
          )}

          <div className="rounded-lg bg-amber/20 p-3 text-xs font-bold leading-relaxed text-ink/80 dark:text-white/80">
            <div className="mb-1 flex items-center gap-2 text-ink dark:text-white">
              <Info className="h-4 w-4" aria-hidden="true" />
              Limitação importante
            </div>
            Tradução automática pode conter limitações. Consulte intérprete ou educador quando necessário.
          </div>
        </aside>
      </div>
    </section>
  );
}
