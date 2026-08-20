import Link from "next/link";
import { BookOpenCheck, Captions, GraduationCap, HandHeart, ShieldCheck, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { LibrasLiveMascot } from "@/components/LibrasLiveMascot";

const sections = [
  {
    title: "O problema",
    icon: HandHeart,
    text: "Professores precisam apoiar alunos surdos ou com deficiência auditiva em aulas ao vivo, mas nem sempre há intérprete disponível para todos os momentos da rotina escolar.",
  },
  {
    title: "A solução",
    icon: Captions,
    text: "O LibrasLive Edu combina legenda ao vivo, glossário, palavras importantes e Avatar Libras com mídias aprovadas para apoiar a compreensão durante a aula.",
  },
  {
    title: "Como funciona em sala",
    icon: GraduationCap,
    text: "O professor cria a aula, compartilha código ou QR Code, fala normalmente e os alunos acompanham legenda, resumo e sinais com vídeo, GIF ou animação curada.",
  },
  {
    title: "Recursos para professores",
    icon: BookOpenCheck,
    text: "A plataforma oferece controle da aula, envio de transcrição, resumo parcial, palavras reconhecidas e relatório pós-aula para revisão pedagógica.",
  },
  {
    title: "Recursos para alunos",
    icon: UsersRound,
    text: "A tela do aluno prioriza legenda em destaque, Avatar em sequência automática, modo de fonte ampliada, alto contraste e palavras salvas para estudo.",
  },
  {
    title: "Acessibilidade e responsabilidade",
    icon: ShieldCheck,
    text: "O sistema é uma ferramenta de apoio pedagógico. Ele não substitui intérprete humano, curadoria especializada em Libras nem políticas de acessibilidade da escola.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-zinc-950 dark:text-white">
      <AppHeader />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-normal text-ocean dark:text-mint">Projeto social educacional</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Sobre o LibrasLive Edu</h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-ink/72 dark:text-white/72">
            Uma plataforma inclusiva para apoiar professores e alunos em sala de aula com legenda ao vivo, apoio visual, glossário e Avatar Libras com mídias curadas.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="focus-ring inline-flex min-h-14 items-center justify-center rounded-lg bg-ocean px-6 py-4 text-base font-black text-white shadow-soft" href="/teacher">
              Testar como professor
            </Link>
            <Link className="focus-ring inline-flex min-h-14 items-center justify-center rounded-lg bg-white px-6 py-4 text-base font-black text-ocean shadow-soft dark:bg-zinc-900 dark:text-mint" href="/aluno">
              Entrar como aluno
            </Link>
          </div>
        </div>
        <div className="rounded-lg border border-ocean/15 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
          <LibrasLiveMascot
            size={460}
            variant="hero"
            ariaLabel="Mascote do LibrasLive Edu apresentando o projeto social"
            className="h-auto w-full"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-ocean/10 text-ocean dark:bg-mint/10 dark:text-mint">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-black">{item.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/70 dark:text-white/70">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-zinc-900">
            <h2 className="text-2xl font-black">Projeto social e impacto</h2>
            <p className="mt-3 text-base font-semibold leading-relaxed text-ink/72 dark:text-white/72">
              O objetivo é reduzir barreiras de acompanhamento em aulas presenciais e remotas, oferecendo uma camada complementar de acessibilidade para escolas que desejam testar recursos digitais com responsabilidade pedagógica.
            </p>
            <p className="mt-3 text-base font-semibold leading-relaxed text-ink/72 dark:text-white/72">
              Escolas podem iniciar um piloto com poucas turmas, revisar vocabulário usado em aula, cadastrar sinais autorizados e acompanhar relatórios para planejar melhorias de acessibilidade.
            </p>
          </div>
          <InstitutionalNotice />
        </div>
      </section>
    </main>
  );
}
