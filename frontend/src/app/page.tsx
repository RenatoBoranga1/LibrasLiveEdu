import Link from "next/link";
import { Accessibility, Captions, GraduationCap, MonitorUp, QrCode, Smartphone, UserRound } from "lucide-react";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";

const profileCards = [
  {
    href: "/teacher",
    title: "Sou Professor",
    description: "Crie aulas com código seguro, compartilhe QR Code e transmita conteúdo acessível em tempo real.",
    icon: MonitorUp,
    action: "Preparar aula",
  },
  {
    href: "/aluno",
    title: "Sou Aluno",
    description: "Digite o código da aula, escaneie o QR Code e acompanhe a aula pelo celular.",
    icon: UserRound,
    action: "Entrar pelo celular",
  },
];

const steps = [
  {
    title: "O professor inicia a aula",
    icon: GraduationCap,
  },
  {
    title: "O aluno entra com código ou QR Code",
    icon: QrCode,
  },
  {
    title: "A aula é acompanhada com legenda, avatar e apoio visual",
    icon: Captions,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-zinc-950 dark:text-white">
      <header className="border-b border-ink/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="focus-ring flex items-center gap-3 rounded-lg" aria-label="Início do LibrasLive Edu">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-ocean text-white">
              <Accessibility className="h-6 w-6" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-black">LibrasLive Edu</span>
              <span className="hidden text-xs font-semibold uppercase tracking-normal text-ocean dark:text-mint sm:block">
                acessibilidade educacional
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-bold text-ink/70 dark:text-white/75" aria-label="Navegação principal">
            <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/aluno">
              Aluno
            </Link>
            <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/teacher">
              Professor
            </Link>
            <Link className="focus-ring rounded-lg px-3 py-2 hover:text-ocean dark:hover:text-mint" href="/login">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-ocean/10 px-4 py-2 text-sm font-black text-ocean dark:bg-mint/10 dark:text-mint">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            feito para acompanhar a aula pelo celular
          </div>
          <div>
            <h1 className="text-5xl font-black leading-tight sm:text-6xl">LibrasLive Edu</h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/72 dark:text-white/72">
              Plataforma educacional inclusiva para apoiar alunos surdos com legenda ao vivo, avatar em Libras, cards
              visuais e resumo da aula.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/aluno"
              className="focus-ring inline-flex min-h-14 items-center justify-center rounded-lg bg-ocean px-6 py-4 text-base font-black text-white shadow-soft transition hover:bg-teal-800"
            >
              Entrar como aluno
            </Link>
            <Link
              href="/teacher"
              className="focus-ring inline-flex min-h-14 items-center justify-center rounded-lg border border-ink/15 bg-white px-6 py-4 text-base font-black text-ocean shadow-soft transition hover:border-ocean/50 dark:border-white/15 dark:bg-zinc-900 dark:text-mint"
            >
              Sou professor
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-teal-50 p-5 dark:bg-zinc-900">
            <p className="text-sm font-bold uppercase tracking-normal text-ocean dark:text-mint">Acesso rápido</p>
            <p className="mt-2 text-2xl font-black leading-tight">professor cria a aula, aluno entra com código ou QR Code</p>
          </div>
          <div className="grid gap-3">
            {profileCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.href} href={card.href} className="focus-ring rounded-lg">
                  <article className="flex items-start gap-4 rounded-lg border border-ink/10 bg-white p-4 transition hover:border-ocean/40 hover:bg-teal-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-800">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ocean/10 text-ocean dark:bg-mint/10 dark:text-mint">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-xl font-black">{card.title}</span>
                      <span className="mt-1 block text-sm font-semibold leading-relaxed text-ink/65 dark:text-white/65">
                        {card.description}
                      </span>
                      <span className="mt-3 inline-flex text-sm font-black text-ocean dark:text-mint">{card.action}</span>
                    </span>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="border-y border-ink/10 py-8 dark:border-white/10">
          <h2 className="text-2xl font-black">Como funciona</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-lg bg-white p-5 shadow-soft dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber/25 text-ink dark:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-black text-ocean dark:text-mint">Passo {index + 1}</span>
                  </div>
                  <p className="mt-4 text-lg font-black leading-snug">{step.title}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <InstitutionalNotice />
      </section>

      <footer className="border-t border-ink/10 bg-white/70 dark:border-white/10 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm font-bold text-ink/65 dark:text-white/65 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>LibrasLive Edu · apoio à acessibilidade educacional</p>
          <nav className="flex flex-wrap gap-3" aria-label="Links institucionais">
            <Link className="focus-ring rounded-lg px-2 py-1 hover:text-ocean dark:hover:text-mint" href="/privacy">
              Política de Privacidade
            </Link>
            <Link className="focus-ring rounded-lg px-2 py-1 hover:text-ocean dark:hover:text-mint" href="/terms">
              Termos de Uso
            </Link>
            <Link className="focus-ring rounded-lg px-2 py-1 text-ink/45 hover:text-ocean dark:text-white/45 dark:hover:text-mint" href="/admin">
              Área Administrativa
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
