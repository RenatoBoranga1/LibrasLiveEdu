import type { SignCard } from "@/types/live";

export type StudentCardMedia = { type: "video" | "gif" | "image"; url: string };

export function getStudentCardMedia(card?: SignCard | null): StudentCardMedia | null {
  if (!card) return null;
  const videoUrl = card.avatarVideoUrl || card.videoUrl;
  if (videoUrl) return { type: "video", url: videoUrl };
  if (card.avatarGifUrl) return { type: "gif", url: card.avatarGifUrl };
  if (card.imageUrl) return { type: "image", url: card.imageUrl };
  return null;
}
