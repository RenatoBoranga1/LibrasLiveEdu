import type { LiveCaptionSize } from "@/components/LiveCaption";

export const CAPTION_SIZE_STORAGE_KEY = "libraslive.student.caption-size";
export const HIGH_CONTRAST_STORAGE_KEY = "libraslive.student.high-contrast";
export const CAPTION_SIZES: readonly LiveCaptionSize[] = ["regular", "large", "extra-large"];
export const DEFAULT_CAPTION_SIZE_INDEX = 1;

export type CaptionSizeIndex = 0 | 1 | 2;

export function normalizeCaptionSizeIndex(value: unknown): CaptionSizeIndex {
  if (value === null || value === undefined || value === "") return DEFAULT_CAPTION_SIZE_INDEX;
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed < CAPTION_SIZES.length) {
    return parsed as CaptionSizeIndex;
  }
  return DEFAULT_CAPTION_SIZE_INDEX;
}

export function clampCaptionSizeIndex(value: number): CaptionSizeIndex {
  return Math.min(CAPTION_SIZES.length - 1, Math.max(0, value)) as CaptionSizeIndex;
}

export function readStudentPreferences(storage: Pick<Storage, "getItem">) {
  try {
    return {
      captionSizeIndex: normalizeCaptionSizeIndex(storage.getItem(CAPTION_SIZE_STORAGE_KEY)),
      highContrast: storage.getItem(HIGH_CONTRAST_STORAGE_KEY) === "true",
    };
  } catch {
    return {
      captionSizeIndex: DEFAULT_CAPTION_SIZE_INDEX as CaptionSizeIndex,
      highContrast: false,
    };
  }
}

export function normalizeSavedWords(value: string | null, maxItems = 50): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const normalized = parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return Array.from(new Set(normalized)).slice(0, maxItems);
  } catch {
    return [];
  }
}
