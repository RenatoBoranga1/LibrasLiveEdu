"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { ActionButton } from "@/components/ActionButton";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { useAuth } from "@/features/auth/AuthProvider";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState(demoMode ? "professor.demo@libraslive.local" : "");
  const [password, setPassword] = useState(demoMode ? "LibrasLive#2026" : "");
  const [nextPath, setNextPath] = useState("/teacher");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/")) setNextPath(next);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.replace(nextPath);
    } catch {
      setError("E-mail ou senha inválidos. Verifique os dados e tente novamente.");
    }
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <section className="mx-auto grid max-w-xl gap-4 px-4 py-8">
        <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <h1 className="text-3xl font-black text-ink dark:text-white">Entrar</h1>
          <p className="mt-2 text-sm font-semibold text-ink/70 dark:text-white/70">
            Professores, administradores e curadores precisam de login para proteger aulas e sinais.
          </p>
          {error && (
            <div role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">
              {error}
            </div>
          )}
          {demoMode && (
            <div className="mt-4 rounded-lg bg-amber/20 p-3 text-sm font-bold leading-relaxed text-ink dark:text-white">
              <p>Credenciais de demonstração</p>
              <p className="mt-1">professor.demo@libraslive.local</p>
              <p>LibrasLive#2026</p>
            </div>
          )}
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              E-mail
              <input
                className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-bold text-ink/75 dark:text-white/75">
              Senha
              <input
                className="focus-ring mt-2 w-full rounded-lg border border-ink/15 bg-white px-4 py-3 text-ink dark:border-white/15 dark:bg-zinc-950 dark:text-white"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <ActionButton>
              <LogIn className="h-5 w-5" aria-hidden="true" />
              Entrar com segurança
            </ActionButton>
          </form>
          <p className="mt-4 text-sm font-semibold text-ink/70 dark:text-white/70">
            Ainda não tem conta? <Link className="text-ocean underline dark:text-mint" href="/register">Cadastrar</Link>
          </p>
        </div>
        <InstitutionalNotice />
      </section>
    </main>
  );
}
