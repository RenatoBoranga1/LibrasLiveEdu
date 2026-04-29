import Link from "next/link";
import { Accessibility, GraduationCap } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-ink/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-lg">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-ocean text-white">
            <Accessibility className="h-6 w-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-black text-ink dark:text-white">LibrasLive Edu</span>
            <span className="block text-xs font-semibold uppercase tracking-normal text-ocean dark:text-mint">
              acessibilidade educacional
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-3 text-sm font-semibold text-ink/70 dark:text-white/70 sm:flex" aria-label="Navegação principal">
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          <Link className="focus-ring rounded-md px-2 py-1" href="/aluno">Aluno</Link>
          <Link className="focus-ring rounded-md px-2 py-1" href="/teacher">Professor</Link>
          <Link className="focus-ring rounded-md px-2 py-1" href="/login">Login</Link>
        </nav>
      </div>
    </header>
  );
}
