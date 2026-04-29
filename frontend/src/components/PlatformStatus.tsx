"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/services/api";

export function PlatformStatus() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    fetch(`${API_BASE}/api/health`, { signal: controller.signal, cache: "no-store" })
      .then((response) => setApiOnline(response.ok))
      .catch(() => setApiOnline(false))
      .finally(() => window.clearTimeout(timer));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-zinc-900" aria-label="Status da plataforma">
      <h2 className="text-lg font-black text-ink dark:text-white">Status da plataforma</h2>
      <div className="mt-3 grid gap-2 text-sm font-bold text-ink/75 dark:text-white/75">
        <StatusItem label="Frontend publicado" status="ativo" />
        <StatusItem label="PWA disponível" status="ativa" />
        <StatusItem
          label="API conectada"
          status={apiOnline === null ? "verificando" : apiOnline ? "API online" : "API indisponível no momento"}
        />
      </div>
    </section>
  );
}

function StatusItem({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-teal-50 px-3 py-2 dark:bg-zinc-800">
      <span>{label}</span>
      <span className="rounded-full bg-white px-2 py-1 text-xs text-ocean dark:bg-zinc-950 dark:text-mint">{status}</span>
    </div>
  );
}
