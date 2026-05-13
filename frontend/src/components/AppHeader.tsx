import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";

export function AppHeader() {
  return (
    <header className="border-b border-ink/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-lg">
          <LibrasLiveLogo />
        </Link>
        <nav className="hidden items-center gap-3 text-sm font-semibold text-ink/70 dark:text-white/70 sm:flex" aria-label="Navegação principal">
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          <Link className="focus-ring rounded-md px-2 py-1" href="/aluno">Aluno</Link>
          <Link className="focus-ring rounded-md px-2 py-1" href="/teacher">Professor</Link>
          <Link className="focus-ring rounded-md px-2 py-1" href="/diagnostico">Diagnóstico</Link>
          <Link className="focus-ring rounded-md px-2 py-1" href="/login">Login</Link>
        </nav>
      </div>
    </header>
  );
}
