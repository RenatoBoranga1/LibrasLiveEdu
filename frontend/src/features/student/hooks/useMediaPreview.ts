"use client";

import { useCallback, useState } from "react";
import type { SignCard } from "@/types/live";

export function useMediaPreview() {
  const [card, setCard] = useState<SignCard | null>(null);
  const closePreview = useCallback(() => setCard(null), []);
  return { previewCard: card, openPreview: setCard, closePreview };
}
