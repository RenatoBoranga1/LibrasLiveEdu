"use client";

import { useEffect, useState } from "react";
import { useLiveClass } from "@/hooks/useLiveClass";
import { getClassByAccessCode, getLiveSummaryByAccessCode, joinClass } from "@/services/classesApi";
import type { ClassSession, LiveSummary } from "@/types/live";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function useStudentClassroom(accessCode: string) {
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [classSession, setClassSession] = useState<ClassSession | null>(null);
  const [initialSummary, setInitialSummary] = useState<LiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [classEnded, setClassEnded] = useState(false);
  const live = useLiveClass(accessCode, joinToken, "student");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) setJoinToken(token);
    joinClass(accessCode, token)
      .then((session) => {
        setClassSession(session);
        if (session.join_token && !token) setJoinToken(session.join_token);
      })
      .catch((error) => {
        if (String(error).includes("410")) {
          setNotice("Esta aula foi encerrada.");
          setClassEnded(true);
          return;
        }
        return getClassByAccessCode(accessCode).then(setClassSession).catch(() => {
          if (demoMode) setClassSession({ id: 1, title: "Aula demo", subject_id: null, access_code: accessCode, status: "active" });
          else setNotice("Não encontramos essa aula. Confira o código com o professor e tente novamente.");
        });
      })
      .finally(() => setLoading(false));
  }, [accessCode]);

  useEffect(() => {
    if (live.connectionError?.toLowerCase().includes("encerrada")) setClassEnded(true);
  }, [live.connectionError]);

  useEffect(() => {
    if (!classSession) return;
    getLiveSummaryByAccessCode(accessCode).then(setInitialSummary).catch(() => undefined);
  }, [accessCode, classSession]);

  return { live, classSession, initialSummary, loading, notice, classEnded };
}
