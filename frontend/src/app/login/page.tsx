"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { Card } from "@/components/ui/Card";
import { InlineFeedback } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/FormControls";
import { PageShell } from "@/components/ui/Layout";
import { useAuth } from "@/features/auth/AuthProvider";
import { getRoleHome } from "@/features/auth/roles";
import { getApiErrorMessage } from "@/services/authApi";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState(demoMode ? "professor.demo@libraslive.local" : "");
  const [password, setPassword] = useState(demoMode ? "LibrasLive#2026" : "");
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) setNextPath(next);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const response = await login(email, password);
      router.replace(nextPath || getRoleHome(response.user.role));
    } catch (caught) {
      setError(getApiErrorMessage(caught, "E-mail ou senha inválidos. Verifique os dados e tente novamente."));
    }
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <PageShell width="narrow" className="grid gap-4 py-8">
        <Card as="section" padding="lg" className="shadow-soft">
          <h1 className="text-3xl font-black text-ink dark:text-white">Entrar</h1>
          <p className="mt-2 text-sm font-semibold text-ink/70 dark:text-white/70">
            Professores, administradores e curadores precisam de login para proteger aulas e sinais.
          </p>
          {error ? <InlineFeedback className="mt-4" variant="error">{error}</InlineFeedback> : null}
          {demoMode && (
            <div className="mt-4 rounded-lg bg-amber/20 p-3 text-sm font-bold leading-relaxed text-ink dark:text-white">
              <p>Credenciais de demonstração</p>
              <p className="mt-1">professor.demo@libraslive.local</p>
              <p>LibrasLive#2026</p>
            </div>
          )}
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Input label="E-mail" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input label="Senha" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <ActionButton>
              <LogIn className="h-5 w-5" aria-hidden="true" />
              Entrar com segurança
            </ActionButton>
          </form>
          <p className="mt-4 text-sm font-semibold text-ink/70 dark:text-white/70">
            Ainda não tem conta? <Link className="text-ocean underline dark:text-mint" href="/register">Cadastrar</Link>
          </p>
        </Card>
        <InstitutionalNotice />
      </PageShell>
    </main>
  );
}
