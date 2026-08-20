import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Captions,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  GraduationCap,
  Images,
  MonitorUp,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { LibrasLiveWelcomeVisual } from "@/components/brand/LibrasLiveWelcomeVisual";
import { LibrasLiveRealisticVisual } from "@/components/brand/LibrasLiveRealisticVisual";
import { AppSection, FeatureCard, InfoBadge } from "@/components/ui/ProductUI";

const steps = [
  { icon: GraduationCap, title: "Professor cria a aula", description: "Uma sala segura é preparada com tema, código de acesso e QR Code." },
  { icon: QrCode, title: "Aluno entra rapidamente", description: "O acesso funciona pelo celular sem exigir uma conta para acompanhar a aula." },
  { icon: Captions, title: "Conteúdo chega ao vivo", description: "Legenda, sinais aprovados e apoios visuais acompanham a explicação do professor." },
  { icon: BookOpenCheck, title: "A turma pode revisar", description: "Resumo e palavras importantes ficam organizados para retomar o conteúdo." },
];

const benefits = [
  { icon: Captions, title: "Legenda ao vivo", description: "Texto em destaque para acompanhar a fala com leitura confortável em diferentes telas." },
  { icon: Sparkles, title: "Avatar Libras", description: "Vídeos, GIFs e animações aprovadas são reproduzidos em sequência, com fonte e licença." },
  { icon: Images, title: "Apoio visual", description: "Imagens de referência aparecem separadas da tradução animada e nunca são tratadas como sinal completo." },
  { icon: BookOpenCheck, title: "Resumo da aula", description: "Conteúdo essencial e palavras importantes apoiam a revisão depois do encontro." },
  { icon: ShieldCheck, title: "Curadoria responsável", description: "Toda mídia passa por validação, rastreabilidade e aprovação antes de chegar ao Avatar." },
  { icon: UsersRound, title: "Inclusão em sala", description: "Recursos pensados para apoiar estudantes, professores e escolas em um único fluxo." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-zinc-950 dark:text-white">
      <AppHeader />

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="surface-grid absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:py-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <InfoBadge>Educação inclusiva em tempo real</InfoBadge>
              <LibrasLiveWelcomeVisual variant="compact" decorative className="lg:hidden" />
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:mt-6 sm:text-5xl">
              Apoio inclusivo em sala de aula com Libras ao vivo
            </h1>
            <p className="mt-4 max-w-xl text-lg font-medium leading-relaxed text-white/76 sm:mt-5">
              Legenda em tempo real, Avatar Libras, apoio visual e recursos para professores e alunos acompanharem a aula com mais acesso à informação.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Link href="/teacher" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-mint-strong px-6 py-4 text-base font-extrabold text-ink shadow-soft transition hover:bg-white">
                <MonitorUp className="h-5 w-5" aria-hidden="true" />
                Sou Professor
              </Link>
              <Link href="/aluno" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-white px-6 py-4 text-base font-extrabold text-ocean shadow-soft transition hover:bg-sky">
                <UserRound className="h-5 w-5" aria-hidden="true" />
                Sou Aluno
              </Link>
              <Link href="/about" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-4 text-base font-extrabold text-white transition hover:bg-white/10">
                Conheça o projeto
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-5 flex max-w-xl items-start gap-2 text-sm font-semibold leading-relaxed text-white/68 sm:mt-6">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint-strong" aria-hidden="true" />
              Ferramenta de apoio pedagógico. Não substitui o intérprete humano de Libras.
            </p>
          </div>
          <LibrasLiveWelcomeVisual priority decorative className="hidden h-[510px] lg:block" />
        </div>
      </section>

      <AppSection
        eyebrow="Como funciona"
        title="Da fala do professor ao apoio visual do aluno"
        description="Um fluxo simples para entrar na aula, acompanhar o conteúdo e revisar o que foi apresentado."
      >
        <ol className="grid gap-0 overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900 md:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative border-b border-ink/10 p-5 last:border-b-0 dark:border-white/10 md:border-b-0 md:border-r md:last:border-r-0">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-sky text-ocean dark:bg-white/10 dark:text-mint-strong"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="text-2xl font-extrabold text-ink/16 dark:text-white/18">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-ink/64 dark:text-white/64">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </AppSection>

      <AppSection
        tone="soft"
        eyebrow="Principais benefícios"
        title="Acessibilidade organizada para a rotina escolar"
        description="Cada recurso tem um papel claro e mantém a responsabilidade pedagógica no centro da experiência."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => <FeatureCard key={benefit.title} {...benefit} accent={index === 4 ? "amber" : index === 5 ? "coral" : "ocean"} />)}
        </div>
      </AppSection>

      <AppSection
        eyebrow="Recursos por perfil"
        title="Uma experiência própria para cada pessoa na aula"
        description="A interface reduz o esforço operacional e mantém o conteúdo essencial em destaque."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <ProfileBlock title="Para professores" description="Crie aulas, compartilhe QR Code, acompanhe a transcrição e gere relatórios pedagógicos." href="/teacher" action="Preparar uma aula" visual={<LibrasLiveRealisticVisual variant="teacher" decorative />} />
          <ProfileBlock title="Para alunos" description="Entre pelo celular, ajuste a leitura e acompanhe legenda, Avatar Libras e resumo." href="/aluno" action="Entrar em uma aula" visual={<LibrasLiveRealisticVisual variant="student" decorative />} />
          <ProfileBlock title="Para escolas" description="Organize a curadoria de sinais, valide fontes e acompanhe a cobertura de mídias aprovadas." href="/about" action="Conhecer o projeto" visual={<LibrasLiveRealisticVisual variant="curation" decorative />} />
        </div>
      </AppSection>

      <AppSection tone="dark" eyebrow="Projeto social" title="Tecnologia com propósito e responsabilidade" description="O LibrasLive Edu foi criado para reduzir barreiras de acompanhamento em aulas presenciais e remotas. A plataforma complementa o trabalho pedagógico e preserva a necessidade de curadoria especializada em Libras.">
        <div className="grid gap-4 border-t border-white/14 pt-7 sm:grid-cols-3">
          <ImpactItem icon={ShieldCheck} title="Privacidade desde o início" text="Consentimento, direitos de dados e rastreabilidade fazem parte do produto." />
          <ImpactItem icon={ChartNoAxesColumnIncreasing} title="Evolução mensurável" text="Relatórios ajudam escolas a identificar vocabulário e oportunidades de melhoria." />
          <ImpactItem icon={GraduationCap} title="Apoio à escola" text="Pilotos podem começar com poucas turmas e crescer com revisão responsável." />
        </div>
      </AppSection>

      <section className="bg-mint py-12 text-ink dark:bg-ocean dark:text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold text-ocean dark:text-mint-strong">Pronto para começar?</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Comece uma aula inclusiva</h2>
            <p className="mt-3 font-medium leading-relaxed text-ink/68 dark:text-white/70">Escolha seu perfil e acesse uma experiência preparada para sala de aula.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/teacher" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-ink px-6 py-4 font-extrabold text-white dark:bg-white dark:text-ink">Entrar como professor <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
            <Link href="/aluno" className="focus-ring inline-flex min-h-14 items-center justify-center rounded-lg border border-ink/15 bg-white px-6 py-4 font-extrabold text-ocean shadow-soft dark:border-white/20 dark:bg-transparent dark:text-white">Entrar como aluno</Link>
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}

function ProfileBlock({ title, description, href, action, visual }: { title: string; description: string; href: string; action: string; visual: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft dark:border-white/10 dark:bg-zinc-900">
      <div className="aspect-[13/8] overflow-hidden bg-sky/45 dark:bg-white/5">{visual}</div>
      <div className="p-5">
        <h3 className="text-2xl font-extrabold">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink/65 dark:text-white/65">{description}</p>
        <Link href={href} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-extrabold text-ocean dark:text-mint-strong">{action}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

function ImpactItem({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <article className="flex items-start gap-4 py-2">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/10 text-mint-strong"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <div><h3 className="font-extrabold">{title}</h3><p className="mt-1 text-sm font-medium leading-relaxed text-white/65">{text}</p></div>
    </article>
  );
}
