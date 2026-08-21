"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { LiveViewMode } from "@/components/LiveModeSelector";
import {
  CAPTION_SIZE_STORAGE_KEY,
  clampCaptionSizeIndex,
  DEFAULT_CAPTION_SIZE_INDEX,
  HIGH_CONTRAST_STORAGE_KEY,
  readStudentPreferences,
  type CaptionSizeIndex,
} from "@/lib/studentPreferences";

export function useStudentPreferences() {
  const [highContrast, setHighContrast] = useState(false);
  const [captionSizeIndex, setCaptionSizeIndex] = useState<CaptionSizeIndex>(DEFAULT_CAPTION_SIZE_INDEX);
  const [summaryTextScale, setSummaryTextScale] = useState<0 | 1 | 2>(0);
  const [viewMode, setViewMode] = useState<LiveViewMode>("full");
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    const preferences = readStudentPreferences(window.localStorage);
    setCaptionSizeIndex(preferences.captionSizeIndex);
    setHighContrast(preferences.highContrast);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(CAPTION_SIZE_STORAGE_KEY, String(captionSizeIndex));
      window.localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(highContrast));
    } catch {
      // Keep in-memory preferences available when storage is blocked.
    }
  }, [captionSizeIndex, highContrast, loaded]);

  return {
    highContrast,
    captionSizeIndex,
    summaryTextScale,
    viewMode,
    setHighContrast,
    setSummaryTextScale,
    setViewMode,
    changeCaptionSize: (direction: -1 | 1) => setCaptionSizeIndex((current) => clampCaptionSizeIndex(current + direction)),
    toggleFocusMode: () => setViewMode((current) => current === "focus" ? "full" : "focus"),
  };
}
