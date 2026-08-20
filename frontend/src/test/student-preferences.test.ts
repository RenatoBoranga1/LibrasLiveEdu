import { describe, expect, it } from "vitest";
import {
  clampCaptionSizeIndex,
  normalizeCaptionSizeIndex,
  normalizeSavedWords,
  readStudentPreferences,
} from "@/lib/studentPreferences";

describe("student accessibility preferences", () => {
  it("accepts only the three bounded caption size levels", () => {
    expect(normalizeCaptionSizeIndex("0")).toBe(0);
    expect(normalizeCaptionSizeIndex("2")).toBe(2);
    expect(normalizeCaptionSizeIndex(null)).toBe(1);
    expect(normalizeCaptionSizeIndex("999")).toBe(1);
    expect(normalizeCaptionSizeIndex("not-a-number")).toBe(1);
    expect(clampCaptionSizeIndex(-1)).toBe(0);
    expect(clampCaptionSizeIndex(3)).toBe(2);
  });

  it("falls back safely when persisted preferences are invalid", () => {
    const storage = {
      getItem: (key: string) => key.includes("caption-size") ? "999" : "invalid",
    };

    expect(readStudentPreferences(storage)).toEqual({
      captionSizeIndex: 1,
      highContrast: false,
    });
  });

  it("ignores corrupt saved words and bounds valid lists", () => {
    expect(normalizeSavedWords("not-json")).toEqual([]);
    expect(normalizeSavedWords(JSON.stringify({ word: "aprender" }))).toEqual([]);
    expect(normalizeSavedWords(JSON.stringify([" aprender ", "", 42, "aprender", "abacate"]), 2)).toEqual([
      "aprender",
      "abacate",
    ]);
  });
});
