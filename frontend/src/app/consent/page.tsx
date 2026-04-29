"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { useRequireRole } from "@/features/auth/AuthProvider";
import { submitConsent } from "@/services/api";

export default function ConsentPage() {
  useRequireRole(["admin", "professor", "student", "curator", "guardian"]);
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitConsent({ guardian_name: guardianName, guardian_email: guardianEmail }).catch(() => undefined);
    setMessage("Consentimento registrado para fins educacionais e de acessibilidade.");
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow-soft dark:bg-zinc-900">
          <h1 className="text-3xl font-black text-ink dark:text-white">Consentimento</h1>
          <p className="mt-3 font-semibold leading-relaxed text-ink/75 dark:text-white/75">
            Para criancas e adolescentes, o uso deve seguir autorizacao da escola e/ou responsavel legal.
          </p>
          {message && <div role="status" className="mt-4 rounded-lg bg-ocean p-3 font-bold text-white">{message}</div>}
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              Nome do responsavel
              <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" value={guardianName} onChange={(event) => setGuardianName(event.target.value)} />
            </label>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              E-mail do responsavel
              <input className="focus-ring mt-2 w-full rounded-lg border border-ink/15 px-4 py-3 dark:border-white/15 dark:bg-zinc-950 dark:text-white" type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} />
            </label>
            <ActionButton>
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Registrar consentimento
            </ActionButton>
          </form>
        </div>
      </section>
    </main>
  );
}
