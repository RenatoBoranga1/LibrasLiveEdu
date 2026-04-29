import Link from "next/link";
import { MonitorUp, PlayCircle, Shield, UserRound } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { ModeBadge } from "@/components/ModeBadge";
import { PlatformStatus } from "@/components/PlatformStatus";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const roles = [
  {
    href: "/teacher",
    label: "Sou Professor",
    description: "Crie aulas com código seguro, QR Code e legenda em tempo real.",
    helper: "Requer login",
    icon: MonitorUp,
    tone: "default",
  },
  {
    href: "/aluno",
    label: "Sou Aluno",
    description: "Digite o código da aula, escaneie o QR Code e acompanhe pelo celular.",
    helper: "Não precisa de conta",
    icon: UserRound,
    tone: "default",
  },
  {
    href: "/admin",
    label: "Acesso administrativo",
    description: "Área restrita para curadoria, importações e revisão de sinais.",
    helper: "Admin ou curador",
    icon: Shield,
    tone: "quiet",
  },
];

if (demoMode) {
  roles.push({
    href: "/join/AULA-4821",
    label: "Demonstração",
    description: "Abra uma aula simulada para testar legenda, avatar e cards visuais.",
    helper: "Modo demonstração",
    icon: PlayCircle,
    tone: "demo",
  });
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div className="flex flex-col justify-center gap-6">
          <ModeBadge label={demoMode ? "modo demonstração" : "ambiente de produção"} />
          <div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-ink dark:text-white md:text-6xl">
              LibrasLive Edu
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/75 dark:text-white/75">
              Plataforma educacional inclusiva para apoiar alunos surdos com legenda ao vivo, avatar em Libras,
              cards visuais, histórico da aula, resumo automático e glossário por disciplina.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => {
              const Icon = role.icon;
              const isDemo = role.tone === "demo";
              const isQuiet = role.tone === "quiet";
              return (
                <Link key={role.href} href={role.href} className="focus-ring rounded-lg">
                  <article
                    className={`h-full rounded-lg border p-5 shadow-soft transition hover:-translate-y-0.5 ${
                      isDemo
                        ? "border-amber bg-amber/20 hover:border-yellow-600"
                        : isQuiet
                          ? "border-ink/10 bg-white/70 hover:border-ocean/30 dark:border-white/10 dark:bg-zinc-900/70"
                          : "border-ink/10 bg-white hover:border-ocean/40 dark:border-white/10 dark:bg-zinc-900"
                    }`}
                  >
                    <Icon className="h-8 w-8 text-ocean dark:text-mint" aria-hidden="true" />
                    <h2 className="mt-4 text-xl font-black text-ink dark:text-white">{role.label}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink/65 dark:text-white/65">{role.description}</p>
                    <span className="mt-4 inline-flex rounded-full bg-ocean/10 px-3 py-1 text-xs font-black text-ocean dark:bg-mint/10 dark:text-mint">
                      {role.helper}
                    </span>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <div className="grid gap-4">
              <div className="rounded-lg bg-teal-50 p-5 dark:bg-zinc-800">
                <p className="text-sm font-bold uppercase tracking-normal text-ocean dark:text-mint">Fluxo ao vivo</p>
                <p className="mt-2 text-2xl font-black text-ink dark:text-white">
                  professor fala, aluno acompanha por legenda, avatar e cards visuais
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-amber/20 p-4">
                  <p className="text-3xl font-black text-ink">150+</p>
                  <p className="text-sm font-semibold text-ink/70">palavras iniciais para curadoria</p>
                </div>

                <div className="rounded-lg bg-ocean/10 p-4">
                  <p className="text-3xl font-black text-ink dark:text-white">PWA</p>
                  <p className="text-sm font-semibold text-ink/70 dark:text-white/70">
                    mobile-first, instalável e preparada para sala de aula
                  </p>
                </div>
              </div>
            </div>
          </div>
          <PlatformStatus />
          <InstitutionalNotice />

          <Link href={demoMode ? "/join/AULA-4821" : "/aluno"} className="focus-ring rounded-lg">
            <span className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber px-4 py-3 text-base font-black text-ink transition hover:bg-yellow-400">
              {demoMode ? "Entrar na demonstração" : "Entrar como aluno"}
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
