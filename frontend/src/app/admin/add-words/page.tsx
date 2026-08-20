"use client";

import { useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FilePlus, RotateCcw, Upload, Wand2 } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { SignCurationIllustration } from "@/components/illustrations/SignCurationIllustration";
import { PageHero } from "@/components/ui/ProductUI";
import { useRequireRole } from "@/features/auth/AuthProvider";
import {
  createManualSign,
  validateMediaUrl,
  type ManualSignPayload,
  type MediaValidationExpectedType,
  type MediaValidationResult,
} from "@/services/api";
import type { SignRecord } from "@/types/live";

const DEFAULT_FORM = {
  word: "",
  gloss: "",
  example_sentence: "",
  video_url: "",
  avatar_gif_url: "",
  image_url: "",
  source_name: "Dicionário da Língua Brasileira de Sinais - INES",
  source_url: "https://dicionario.ines.gov.br/",
  source_reference_url: "https://dicionario.ines.gov.br/",
  license: "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu",
  license_notes: "Mídia autorizada para uso educacional no aplicativo LibrasLive Edu.",
  curator_notes: "Palavra cadastrada manualmente e mantida pendente para curadoria.",
};

type ManualFormState = typeof DEFAULT_FORM;

export default function AddWordsPage() {
  const auth = useRequireRole(["admin", "curator"]);
  const manualSectionRef = useRef<HTMLElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ManualFormState>(DEFAULT_FORM);
  const [validation, setValidation] = useState<MediaValidationResult | null>(null);
  const [createdSign, setCreatedSign] = useState<SignRecord | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"validate" | "save" | null>(null);

  function updateField(field: keyof ManualFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "video_url" || field === "avatar_gif_url") {
      setValidation(null);
    }
  }

  function openManualForm() {
    manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => wordInputRef.current?.focus(), 250);
  }

  function resetForm() {
    setForm(DEFAULT_FORM);
    setValidation(null);
    setCreatedSign(null);
    setMessage("");
    setError("");
    window.setTimeout(() => wordInputRef.current?.focus(), 0);
  }

  async function testMedia(): Promise<boolean> {
    setError("");
    setMessage("");
    setCreatedSign(null);
    const media = selectedAnimatedMedia(form);
    if (!media) {
      if (form.image_url.trim()) {
        setMessage("Imagem é apenas apoio visual e não será usada como Avatar Libras.");
        return true;
      } else {
        setError("Informe uma URL de vídeo ou GIF antes de testar mídia animada.");
        return false;
      }
    }
    setLoading("validate");
    try {
      const result = await validateMediaUrl({ url: media.url, expected_type: media.expected_type });
      setValidation(result);
      if (!result.valid) {
        setError("Esta URL não será salva como Avatar Libras. " + result.reason);
        return false;
      }
      setMessage("Mídia validada. Revise fonte e licença antes de salvar como pendente.");
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível testar a mídia.");
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function saveManualSign() {
    setError("");
    setMessage("");
    setCreatedSign(null);
    if (!form.word.trim()) {
      setError("Informe a palavra antes de salvar.");
      wordInputRef.current?.focus();
      return;
    }
    if ((form.video_url.trim() || form.avatar_gif_url.trim()) && !hasSourceAndLicense(form)) {
      setError("Para vídeo ou GIF, informe fonte, URL da fonte, licença/autorização e observações de licença.");
      return;
    }
    if (form.video_url.trim() || form.avatar_gif_url.trim()) {
      const mediaOk = await testMedia();
      if (!mediaOk) return;
    } else if (form.image_url.trim()) {
      setMessage("Imagem registrada apenas como apoio visual; a palavra continuará sem mídia animada para Avatar.");
    }
    setLoading("save");
    try {
      const payload: ManualSignPayload = {
        word: form.word.trim(),
        gloss: emptyToUndefined(form.gloss),
        example_sentence: emptyToUndefined(form.example_sentence),
        video_url: emptyToUndefined(form.video_url),
        avatar_gif_url: emptyToUndefined(form.avatar_gif_url),
        image_url: emptyToUndefined(form.image_url),
        source_name: emptyToUndefined(form.source_name),
        source_url: emptyToUndefined(form.source_url),
        source_reference_url: emptyToUndefined(form.source_reference_url),
        license: emptyToUndefined(form.license),
        license_notes: emptyToUndefined(form.license_notes),
        curator_notes: emptyToUndefined(form.curator_notes),
      };
      const created = await createManualSign(payload);
      setCreatedSign(created);
      setMessage(`"${created.word}" foi salva como pendente de revisão para curadoria.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a palavra.");
    } finally {
      setLoading(null);
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
      <PageHero
        eyebrow="Curadoria de vocabulário"
        title="Adicionar novas palavras"
        description="Escolha entre o padrão automático do INES, cadastro manual ou importação de uma lista autorizada. Toda palavra nova permanece pendente para revisão."
        actions={
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/admin">
            Voltar para curadoria
          </Link>
        }
        visual={<SignCurationIllustration decorative className="h-auto w-full -translate-y-8" />}
      />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-4 lg:grid-cols-3" aria-label="Opções para adicionar palavras">
          <OptionCard
            icon={<Wand2 className="h-7 w-7" aria-hidden="true" />}
            title="Adicionar pelo padrão INES"
            description="Gera a URL do vídeo automaticamente no padrão {palavraNormalizada}Sm_Prog001.mp4, testa se o vídeo existe e adiciona apenas URLs válidas."
            hint="Indicado para quando você quer adicionar várias palavras rapidamente."
            action={<Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-ocean px-4 py-3 text-sm font-black text-white" href="/admin/ines-standard-video">Usar preenchimento automático</Link>}
          />
          <OptionCard
            icon={<FilePlus className="h-7 w-7" aria-hidden="true" />}
            title="Cadastrar manualmente"
            description="Use quando você já tem a URL correta do vídeo, GIF ou imagem de apoio e deseja revisar os dados antes de salvar."
            hint="A palavra será salva como pending e precisará de curadoria antes de aparecer como oficial."
            action={<ActionButton onClick={openManualForm} aria-label="Abrir formulário para cadastrar palavra manualmente">Cadastrar manualmente</ActionButton>}
          />
          <OptionCard
            icon={<Upload className="h-7 w-7" aria-hidden="true" />}
            title="Importar lista de palavras"
            description="Use uma lista em lote quando tiver muitas palavras para cadastrar ou revisar."
            hint="Bom para manifestos autorizados, mídia em lote ou diagnóstico antes da curadoria."
            action={
              <div className="flex flex-wrap gap-2">
                <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint" href="/admin/media-crawler">Importar por manifesto</Link>
                <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-mint px-4 py-3 text-sm font-black text-ink" href="/admin/media-auto-fill">Preenchimento automático</Link>
                <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-ocean shadow-soft dark:bg-zinc-950 dark:text-mint" href="/admin/import/ines-media">Importar INES</Link>
              </div>
            }
          />
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900" aria-labelledby="choose-option">
          <h2 id="choose-option" className="text-xl font-black text-ink dark:text-white">Qual opção devo escolher?</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold leading-relaxed text-ink/75 dark:text-white/75">
            <li>Se você quer adicionar muitas palavras e testar vídeos automaticamente, use Adicionar pelo padrão INES.</li>
            <li>Se você já tem a URL correta do vídeo ou GIF, use Cadastrar manualmente.</li>
            <li>Se você possui uma lista grande com várias URLs, use Importar lista.</li>
          </ul>
        </section>

        <section ref={manualSectionRef} className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900" aria-labelledby="manual-form-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="manual-form-title" className="text-2xl font-black text-ink dark:text-white">Cadastrar manualmente</h2>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">
                Salve a palavra como pendente. Vídeos e GIFs são testados antes do cadastro; imagem fica apenas como apoio visual.
              </p>
            </div>
            {createdSign ? <span className="rounded-full bg-mint px-3 py-2 text-xs font-black text-ink">Status: {createdSign.status}</span> : null}
          </div>

          {error ? (
            <div className="mt-4 flex gap-2 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-950" role="alert">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mt-4 flex gap-2 rounded-lg bg-teal-50 p-3 text-sm font-bold text-ink dark:bg-zinc-800 dark:text-white" role="status">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              {message}
            </div>
          ) : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <FieldGroup title="Dados da palavra">
              <TextField id="manual-word" label="Palavra" value={form.word} onChange={(value) => updateField("word", value)} required inputRef={wordInputRef} />
              <TextField id="manual-gloss" label="Glosa" value={form.gloss} onChange={(value) => updateField("gloss", value)} />
              <TextAreaField id="manual-example" label="Exemplo de uso" value={form.example_sentence} onChange={(value) => updateField("example_sentence", value)} />
            </FieldGroup>

            <FieldGroup title="Mídia">
              <TextField id="manual-video" label="URL do vídeo" value={form.video_url} onChange={(value) => updateField("video_url", value)} placeholder="https://..." />
              <TextField id="manual-gif" label="URL do GIF" value={form.avatar_gif_url} onChange={(value) => updateField("avatar_gif_url", value)} placeholder="https://..." />
              <TextField id="manual-image" label="URL da imagem de apoio" value={form.image_url} onChange={(value) => updateField("image_url", value)} placeholder="https://..." />
              {form.image_url.trim() ? (
                <p className="rounded-lg bg-amber/20 p-3 text-xs font-black text-ink dark:text-white">
                  Imagem é apenas apoio visual e não será usada como Avatar Libras.
                </p>
              ) : null}
            </FieldGroup>

            <FieldGroup title="Fonte e autorização">
              <TextField id="manual-source-name" label="Fonte" value={form.source_name} onChange={(value) => updateField("source_name", value)} />
              <TextField id="manual-source-url" label="URL da fonte" value={form.source_url} onChange={(value) => updateField("source_url", value)} />
              <TextField id="manual-reference-url" label="URL de referência" value={form.source_reference_url} onChange={(value) => updateField("source_reference_url", value)} />
              <TextField id="manual-license" label="Licença/autorização" value={form.license} onChange={(value) => updateField("license", value)} />
              <TextAreaField id="manual-license-notes" label="Observações de licença" value={form.license_notes} onChange={(value) => updateField("license_notes", value)} />
            </FieldGroup>

            <FieldGroup title="Curadoria">
              <TextAreaField id="manual-curator-notes" label="Notas do curador" value={form.curator_notes} onChange={(value) => updateField("curator_notes", value)} />
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="quiet" onClick={testMedia} disabled={loading !== null}>
                  {loading === "validate" ? "Testando..." : "Testar mídia"}
                </ActionButton>
                <ActionButton onClick={saveManualSign} disabled={loading !== null}>
                  {loading === "save" ? "Salvando..." : "Salvar como pendente"}
                </ActionButton>
                <ActionButton tone="quiet" onClick={resetForm} disabled={loading !== null}>
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Limpar formulário
                </ActionButton>
              </div>
              <ValidationPreview validation={validation} imageUrl={form.image_url} word={form.word} />
            </FieldGroup>
          </div>
        </section>
      </div>
    </main>
  );
}

function OptionCard({
  icon,
  title,
  description,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  hint: string;
  action: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
      <div className="grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-ocean dark:bg-zinc-800 dark:text-mint">{icon}</div>
      <h2 className="mt-4 text-xl font-black text-ink dark:text-white">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">{description}</p>
      <p className="mt-3 rounded-lg bg-amber/15 p-3 text-xs font-black text-ink dark:text-white">{hint}</p>
      <div className="mt-4">{action}</div>
    </article>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-ink/10 p-4 dark:border-white/10">
      <legend className="px-2 text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">{title}</legend>
      {children}
    </fieldset>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor={id}>
      {label}
      {required ? <span className="text-red-700"> *</span> : null}
      <input
        ref={inputRef}
        id={id}
        className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-semibold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-required={required || undefined}
      />
    </label>
  );
}

function TextAreaField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold text-ink/70 dark:text-white/70" htmlFor={id}>
      {label}
      <textarea
        id={id}
        className="focus-ring mt-2 min-h-24 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 font-semibold text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ValidationPreview({ validation, imageUrl, word }: { validation: MediaValidationResult | null; imageUrl: string; word: string }) {
  if (validation?.valid && validation.media_type === "video") {
    return (
      <div className="rounded-lg bg-teal-50 p-3 dark:bg-zinc-800">
        <p className="text-sm font-black text-ink dark:text-white">Prévia do vídeo validado</p>
        <video className="mt-2 max-h-48 w-full rounded bg-black object-contain" src={validation.final_url || validation.url} controls muted playsInline preload="metadata" controlsList="nodownload" />
      </div>
    );
  }
  if (validation?.valid && validation.media_type === "gif") {
    return (
      <div className="rounded-lg bg-teal-50 p-3 dark:bg-zinc-800">
        <p className="text-sm font-black text-ink dark:text-white">Prévia do GIF validado</p>
        <img className="mt-2 max-h-48 w-full rounded bg-white object-contain dark:bg-zinc-950" src={validation.final_url || validation.url} alt={`Sinal em Libras para ${word || "palavra"}`} loading="lazy" decoding="async" />
      </div>
    );
  }
  if (imageUrl.trim()) {
    return (
      <div className="rounded-lg bg-amber/15 p-3">
        <p className="text-sm font-black text-ink dark:text-white">Imagem de apoio</p>
        <p className="mt-1 text-xs font-bold text-ink/70 dark:text-white/70">Ela não será usada como Avatar Libras.</p>
        <img className="mt-2 max-h-40 w-full rounded bg-white object-contain dark:bg-zinc-950" src={imageUrl} alt={`Apoio visual para ${word || "palavra"}`} loading="lazy" decoding="async" />
      </div>
    );
  }
  return null;
}

function selectedAnimatedMedia(form: ManualFormState): { url: string; expected_type: MediaValidationExpectedType } | null {
  if (form.video_url.trim()) {
    return { url: form.video_url.trim(), expected_type: "video" };
  }
  if (form.avatar_gif_url.trim()) {
    return { url: form.avatar_gif_url.trim(), expected_type: "gif" };
  }
  return null;
}

function hasSourceAndLicense(form: ManualFormState) {
  return Boolean(form.source_name.trim() && form.source_url.trim() && form.license.trim() && form.license_notes.trim());
}

function emptyToUndefined(value: string) {
  const cleaned = value.trim();
  return cleaned ? cleaned : undefined;
}
