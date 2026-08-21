"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeSavedWords } from "@/lib/studentPreferences";
import { saveWord } from "@/services/classesApi";
import type { SignCard } from "@/types/live";

export function useSavedWords(accessCode: string) {
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1800);
  }, []);

  useEffect(() => {
    try {
      setSavedWords(normalizeSavedWords(window.localStorage.getItem(`libraslive.saved.${accessCode}`)));
    } catch {
      setSavedWords([]);
    }
    return () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    };
  }, [accessCode]);

  const save = useCallback(async (card?: SignCard) => {
    if (!card) return;
    setSavedWords((current) => {
      const next = current.includes(card.word) ? current : [card.word, ...current];
      try { window.localStorage.setItem(`libraslive.saved.${accessCode}`, JSON.stringify(next)); } catch { /* Keep state in memory. */ }
      return next;
    });
    await saveWord({ sign_id: card.id, word: card.word, access_code: accessCode }).catch(() => undefined);
    showNotice(`Palavra salva: ${card.word}`);
  }, [accessCode, showNotice]);

  const clear = useCallback(() => {
    setSavedWords([]);
    try { window.localStorage.removeItem(`libraslive.saved.${accessCode}`); } catch { /* Visible state is still cleared. */ }
    showNotice("Palavras salvas neste celular foram limpas.");
  }, [accessCode, showNotice]);

  return { savedWords, notice, saveWord: save, clearSavedWords: clear };
}
