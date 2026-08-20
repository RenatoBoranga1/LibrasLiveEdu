import Link from "next/link";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";

const links = [
  { href: "/about", label: "Sobre" },
  { href: "/privacy", label: "Privacidade" },
  { href: "/terms", label: "Termos" },
  { href: "/data-rights", label: "Direitos de dados" },
];

export function AppFooter() {
  return (
    <footer className="border-t border-ink/10 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-9 sm:px-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="max-w-xl">
          <LibrasLiveLogo showTagline={false} />
          <p className="mt-4 text-sm font-semibold leading-relaxed text-ink/65 dark:text-white/65">
            Tecnologia educacional para ampliar o acesso à informação em sala de aula com responsabilidade e curadoria.
          </p>
          <p className="mt-3 text-xs font-bold leading-relaxed text-ink/55 dark:text-white/55">
            Ferramenta de apoio à acessibilidade. Não substitui intérprete humano de Libras.
          </p>
        </div>
        <nav className="flex max-w-md flex-wrap gap-x-5 gap-y-2 text-sm font-bold" aria-label="Links institucionais">
          {links.map((link) => (
            <Link key={link.href} className="focus-ring rounded-md py-2 text-ink/70 transition hover:text-ocean dark:text-white/70 dark:hover:text-mint-strong" href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
