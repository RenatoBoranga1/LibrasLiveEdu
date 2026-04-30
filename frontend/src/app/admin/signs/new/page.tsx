"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ExternalLink, Save } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { useRequireRole } from "@/features/auth/AuthProvider";
import { createManualSign, type ManualSignPayload } from "@/services/api";

const initialForm: ManualSignPayload = {
  word: "",
  gloss: "",
  example_sentence: "",
  grammatical_class: "",
  meaning: "",
  handshape: "",
  movement: "",
  location: "",
  orientation: "",
  facial_expression: "",
  source_name: "Dicionário da Língua Brasileira de Sinais - INES",
  source_url: "https://dicionario.ines.gov.br/",
  source_reference_url: "https://dicionario.ines.gov.br/",
  license: "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu",
  license_notes: "Vídeo autorizado para uso educacional no aplicativo LibrasLive Edu.",
  image_url: "",
  video_url: "",
  avatar_video_url: "",
  animation_payload_url: "",
  curator_notes: "Sinal cadastrado com base no Dicionário INES e autorização de uso registrada.",
};

const fields: Array<{ name: keyof ManualSignPayload; label: string; multiline?: boolean; required?: boolean }> = [
  { name: "word", label: "Palavra", required: true },
  { name: "gloss", label: "Glosa" },
  { name: "example_sentence", label: "Frase de exemplo", multiline: true },
  { name: "grammatical_class", label: "Classe gramatical" },
  { name: "meaning", label: "Acepção/significado", multiline: true },
  { name: "handshape", label: "Configuração de mão" },
  { name: "movement", label: "Movimento" },
  { name: "location", label: "Localização" },
  { name: "orientation", label: "Orientação" },
  { name: "facial_expression", label: "Expressão facial" },
  { name: "source_name", label: "Fonte", required: true },
  { name: "source_url", label: "URL da fonte", required: true },
  { name: "source_reference_url", label: "URL específica consultada" },
  { name: "license", label: "Licença", required: true },
  { name: "license_notes", label: "Observações de licença", multiline: true },
  { name: "image_url", label: "URL de imagem autorizada" },
  { name: "video_url", label: "URL de vídeo autorizado" },
  { name: "avatar_video_url", label: "URL de avatar/vídeo próprio" },
  { name: "animation_payload_url", label: "URL de payload de animação" },
  { name: "curator_notes", label: "Observações do curador", multiline: true },
];

export default function NewManualSignPage() {
  const auth = useRequireRole(["admin", "curator"]);
  const [form, setForm] = useState<ManualSignPayload>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await createManualSign(form);
      setMessage("Sinal cadastrado como pendente de curadoria.");
      setForm({ ...initialForm, word: "" });
    } catch {
      setError("Não foi possível cadastrar o sinal. Verifique seu login e a conexão com a API.");
    } finally {
      setSaving(false);
    }
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
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-ocean dark:text-mint">Curadoria manual</p>
            <h1 className="mt-1 text-3xl font-black text-ink dark:text-white">Cadastrar sinal consultado no INES</h1>
            <p className="mt-2 max-w-2xl font-semibold leading-relaxed text-ink/70 dark:text-white/70">
              Use apenas vídeos autorizados para o projeto. Registre a URL da fonte, a URL específica do sinal e a observação de autorização/licença. Todo sinal cadastrado entra como pendente de curadoria.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-lg bg-mint px-4 py-3 text-sm font-bold text-ink shadow-soft"
              href="https://dicionario.ines.gov.br/"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Abrir Dicionário INES
            </a>
            <Link className="focus-ring inline-flex min-h-12 items-center rounded-lg bg-white px-4 py-3 text-sm font-bold text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
              Voltar para curadoria
            </Link>
          </div>
        </div>

        {message && <div role="status" className="mb-4 rounded-lg bg-ocean px-4 py-3 text-sm font-bold text-white">{message}</div>}
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-bold text-red-900">{error}</div>}

        <form className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className="block text-sm font-bold text-ink/70 dark:text-white/70">
                {field.label}
                {field.multiline ? (
                  <textarea
                    className="focus-ring mt-2 min-h-24 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                    value={form[field.name] ?? ""}
                    required={field.required}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                ) : (
                  <input
                    className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                    value={form[field.name] ?? ""}
                    required={field.required}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="rounded-lg bg-amber/20 p-3 text-sm font-bold leading-relaxed text-ink dark:text-white">
            Todo sinal cadastrado aqui entra como <strong>pending</strong>. A aprovação exige curadoria por admin ou especialista.
          </div>
          <ActionButton disabled={saving}>
            <Save className="h-5 w-5" aria-hidden="true" />
            {saving ? "Salvando..." : "Salvar como pendente"}
          </ActionButton>
        </form>

        <div className="mt-5">
          <InstitutionalNotice />
        </div>
      </section>
    </main>
  );
}
