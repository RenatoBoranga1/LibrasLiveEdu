import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";

export function AppHeader() {
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
          <Link className="focus-ring inline-flex items-center gap-2 rounded-lg bg-ocean px-4 py-2.5 text-white shadow-sm transition hover:bg-ink" href="/login">
            Entrar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <Link className="focus-ring rounded-lg px-3 py-2 text-sm font-bold text-ocean dark:text-mint-strong" href="/aluno">Aluno</Link>
          <Link className="focus-ring rounded-lg bg-ocean px-3 py-2 text-sm font-bold text-white" href="/login">Entrar</Link>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm font-bold text-ink/70 dark:text-white/70 sm:hidden" aria-label="Navegação principal no celular">
        <Link className="focus-ring shrink-0 rounded-lg px-3 py-2" href="/about">Projeto</Link>
        <Link className="focus-ring shrink-0 rounded-lg px-3 py-2" href="/teacher">Professor</Link>
        <Link className="focus-ring shrink-0 rounded-lg px-3 py-2" href="/diagnostico">Diagnóstico</Link>
      </nav>
    </header>
  );
}
