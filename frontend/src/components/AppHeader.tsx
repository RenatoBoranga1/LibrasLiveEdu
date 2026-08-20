import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";

export function AppHeader() {
  return (
    <header className="border-b border-ink/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl" aria-label="Início do LibrasLive Edu">
          <LibrasLiveLogo />
        </Link>
        <nav
          className="hidden items-center gap-2 text-sm font-bold text-ink/70 dark:text-white/70 sm:flex"
          aria-label="Navegação principal"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ocean/10 text-ocean dark:bg-mint/10 dark:text-mint">
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
          <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/diagnostico">
            Diagnóstico
          </Link>
          <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/login">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
