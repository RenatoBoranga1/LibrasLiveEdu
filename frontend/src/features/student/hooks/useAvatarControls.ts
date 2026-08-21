"use client";

import { useRef, useState } from "react";
import type { SequentialAvatarPlayerHandle } from "@/components/SequentialAvatarPlayer";

export function useAvatarControls() {
  const playerRef = useRef<SequentialAvatarPlayerHandle | null>(null);
  const [paused, setPaused] = useState(false);
  return {
    playerRef,
    paused,
    setPaused,
    toggle: () => paused ? playerRef.current?.resume() : playerRef.current?.pause(),
    repeat: () => playerRef.current?.repeat(),
  };
}
