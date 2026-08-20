"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, LogOut, UserRound } from "lucide-react";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";
import { useAuth } from "@/features/auth/AuthProvider";
import { getRoleHome, getRoleNavigationLabel } from "@/features/auth/roles";

export function AppHeader() {
  const { user, loading, isAuthenticated } = useAuth();
  const accountHref = getRoleHome(user?.role);
  const accountLabel = getRoleNavigationLabel(user?.role);

  const sessionActions = loading ? (
    <span
      aria-label="Verificando sessão"
      className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-lg bg-ink/5 px-3 text-sm font-bold text-ink/55 dark:bg-white/10 dark:text-white/60"
      role="status"
    >
      Verificando...
    </span>
  ) : isAuthenticated && user ? (
    <>
      <Link
        className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-ocean hover:bg-mint/40 dark:bg-white/10 dark:text-mint"
        href={accountHref}
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
        <span className="hidden max-w-40 truncate lg:inline" title={user.name}>{user.name}</span>
        <span>{accountLabel}</span>
      </Link>
      <Link
        aria-label={`Sair da conta de ${user.name}`}
        className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-ink/70 hover:bg-red-50 hover:text-red-800 dark:text-white/70 dark:hover:bg-red-950/40 dark:hover:text-red-200"
        href="/logout"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">Sair</span>
      </Link>
    </>
  ) : (
    <Link
      className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-ocean px-4 py-2.5 text-white shadow-sm transition hover:bg-ink"
      href="/login"
    >
      Entrar
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl" aria-label="Início do LibrasLive Edu">
          <LibrasLiveLogo />
        </Link>
        <nav
          className="hidden items-center gap-2 text-sm font-bold text-ink/70 dark:text-white/70 sm:flex"
          aria-label="Navegação principal"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky text-ocean dark:bg-white/10 dark:text-mint-strong">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </span>
          <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/about">
            Projeto
          </Link>
          <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/aluno">
            Aluno
          </Link>
          <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/teacher">
            Professor
          </Link>
          {sessionActions}
        </nav>
        <div className="flex items-center gap-1 sm:hidden">
          {sessionActions}
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm font-bold text-ink/70 dark:text-white/70 sm:hidden" aria-label="Navegação principal no celular">
        <Link className="focus-ring shrink-0 rounded-lg px-3 py-2" href="/about">Projeto</Link>
        <Link className="focus-ring shrink-0 rounded-lg px-3 py-2" href="/aluno">Aluno</Link>
        <Link className="focus-ring shrink-0 rounded-lg px-3 py-2" href="/teacher">Professor</Link>
        <Link className="focus-ring shrink-0 rounded-lg px-3 py-2" href="/diagnostico">Diagnóstico</Link>
      </nav>
    </header>
  );
}
