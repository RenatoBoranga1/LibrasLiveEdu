"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, PlayCircle, RotateCcw, XCircle } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import { validateMediaUrl, type MediaValidationExpectedType, type MediaValidationResult } from "@/services/api";

export default function MediaValidatePage() {
  const auth = useRequireRole(["admin"]);
  const [url, setUrl] = useState("");
  const [expectedType, setExpectedType] = useState<MediaValidationExpectedType>("video");
  const [result, setResult] = useState<MediaValidationResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function testMedia() {
    setLoading(true);
    setMessage("");
    setResult(null);
    try {
      const response = await validateMediaUrl({ url, expected_type: expectedType });
      setResult(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível testar a mídia.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setUrl("");
    setExpectedType("video");
    setResult(null);
    setMessage("");
  }

  if (auth.loading) {
    return (
      <main className="min-h-screen bg-paper dark:bg-zinc-950">
        <AppHeader />
        <div role="status" className="mx-auto max-w-lg px-4 py-10 text-lg font-black text-ink dark:text-white">
          Verificando permissão...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">Validação remota</p>
            <h1 className="mt-2 text-3xl font-black text-ink dark:text-white">Testar URL de mídia</h1>
            <p className="mt-2 max-w-3xl text-base font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Confirme HTTP, Content-Type, URL final e prévia antes de usar vídeo, GIF ou animação como mídia do Avatar Libras.
            </p>
          </div>
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
            Voltar para admin
          </Link>
        </div>

        <section className="rounded-lg border border-amber/40 bg-amber/15 p-4 text-sm font-bold leading-relaxed text-ink dark:border-amber/30 dark:text-white" role="note">
          JPG, PNG, WebP e imagens em /public/media/mao/ são apenas apoio visual. Elas não serão salvas como Avatar Libras.
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
              URL da mídia
              <input
                className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-semibold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="block text-sm font-bold text-ink/70 dark:text-white/70">
              Tipo esperado
              <select
                className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-bold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                value={expectedType}
                onChange={(event) => setExpectedType(event.target.value as MediaValidationExpectedType)}
              >
                <option value="video">Vídeo</option>
                <option value="gif">GIF</option>
                <option value="animation">Animação</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton onClick={testMedia} disabled={loading || !url.trim()}>
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
              {loading ? "Testando..." : "Testar mídia"}
            </ActionButton>
            <ActionButton tone="quiet" onClick={reset} disabled={loading}>
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Limpar
            </ActionButton>
          </div>
          {message && <p className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">{message}</p>}
        </section>

        {result && <ValidationResult result={result} expectedType={expectedType} />}
      </div>
    </main>
  );
}

function ValidationResult({ result, expectedType }: { result: MediaValidationResult; expectedType: MediaValidationExpectedType }) {
  const previewUrl = result.final_url || result.url;
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
      <div className={`flex items-start gap-3 rounded-lg p-4 ${result.valid ? "bg-mint/30 text-ink" : "bg-red-100 text-red-950"}`}>
        {result.valid ? <CheckCircle2 className="mt-0.5 h-5 w-5" aria-hidden="true" /> : <XCircle className="mt-0.5 h-5 w-5" aria-hidden="true" />}
        <div>
          <p className="font-black">Validada: {result.valid ? "Sim" : "Não"}</p>
          <p className="mt-1 text-sm font-bold">{result.reason}</p>
          {!result.valid ? <p className="mt-2 text-sm font-black">Esta URL não será salva como Avatar Libras.</p> : null}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Status HTTP" value={result.status_code ?? "-"} />
        <Info label="Content-Type" value={result.content_type ?? "-"} />
        <Info label="Content-Length" value={result.content_length ?? "-"} />
        <Info label="Tipo detectado" value={result.media_type || "-"} />
        <Info label="URL final" value={result.final_url || result.url} wide />
      </dl>

      {result.valid && expectedType === "video" ? (
        <video className="mt-5 max-h-96 w-full rounded-lg bg-black object-contain" src={previewUrl} controls muted playsInline preload="metadata" controlsList="nodownload" />
      ) : null}
      {result.valid && expectedType === "gif" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="mt-5 max-h-96 w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-950" src={previewUrl} alt="Prévia do GIF em Libras" loading="lazy" decoding="async" />
      ) : null}
    </section>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-teal-50 p-3 dark:bg-zinc-800 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs font-black uppercase tracking-normal text-ink/60 dark:text-white/60">{label}</dt>
      <dd className="mt-1 break-all text-sm font-bold text-ink dark:text-white">{value}</dd>
    </div>
  );
}
