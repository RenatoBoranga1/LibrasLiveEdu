import type { SignCard } from "@/types/live";

export type AvatarInput = {
  glossText?: string | null;
  avatarVideoUrl?: string | null;
  videoUrl?: string | null;
  animationPayloadUrl?: string | null;
  status?: string | null;
  providerConfigured?: boolean | null;
  warningMessage?: string | null;
  cards?: SignCard[];
};

export type AvatarRenderState = {
  type: "video" | "animation" | "gloss" | "fallback";
  label: string;
  message: string;
  canRenderAvatar: boolean;
  pendingCuration: boolean;
};

export function resolveAvatarState(input: AvatarInput): AvatarRenderState {
  const statusPending = input.status === "pending";
  const pendingCuration =
    statusPending ||
    input.cards?.some((card) => card.status === "pending" || card.curation === "pending") ||
    false;

  if (statusPending) {
    return {
      type: input.glossText ? "gloss" : "fallback",
      label: "Sinal pendente de curadoria",
      message: "Este sinal ainda está pendente de curadoria por especialista em Libras.",
      canRenderAvatar: false,
      pendingCuration: true,
    };
  }

  if (input.avatarVideoUrl || input.videoUrl) {
    return {
      type: "video",
      label: input.avatarVideoUrl ? "Avatar disponível" : "Vídeo de apoio disponível",
      message: input.avatarVideoUrl
        ? "Vídeo de avatar recebido de fonte configurada."
        : "Vídeo autorizado de apoio recebido para este sinal.",
      canRenderAvatar: true,
      pendingCuration,
    };
  }

  if (input.animationPayloadUrl) {
    return {
      type: "animation",
      label: "Dados de animação recebidos",
      message: "Dados de animação recebidos. Conecte um renderer 3D para exibir o avatar.",
      canRenderAvatar: false,
      pendingCuration,
    };
  }

  if (pendingCuration) {
    return {
      type: input.glossText ? "gloss" : "fallback",
      label: "Sinal pendente de curadoria",
      message: "Este sinal ainda está pendente de curadoria por especialista em Libras.",
      canRenderAvatar: false,
      pendingCuration: true,
    };
  }

  if (input.glossText) {
    return {
      type: "gloss",
      label: "Glosa recebida",
      message: "Glosa técnica recebida como apoio. Ela não representa tradução perfeita em Libras.",
      canRenderAvatar: false,
      pendingCuration: false,
    };
  }

  if (input.providerConfigured === false || input.status === "fallback" || input.status === "unavailable") {
    return {
      type: "fallback",
      label: "Avatar oficial não configurado",
      message:
        input.warningMessage ??
        "A legenda está ativa. O avatar será exibido quando houver sinal aprovado ou provedor configurado.",
      canRenderAvatar: false,
      pendingCuration: false,
    };
  }

  return {
    type: "fallback",
    label: "Aguardando sinal",
    message: "A legenda está ativa. O avatar será exibido quando houver sinal aprovado ou provedor configurado.",
    canRenderAvatar: false,
    pendingCuration: false,
  };
}
