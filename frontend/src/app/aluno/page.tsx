import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { StudentJoinForm } from "@/components/StudentJoinForm";
import { LibrasLiveRealisticVisual } from "@/components/brand/LibrasLiveRealisticVisual";
import { PageHero } from "@/components/ui/ProductUI";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function StudentEntryPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <PageHero
        eyebrow="Acesso do aluno"
        title="Acompanhe sua aula com mais clareza"
        description="Entre com o código compartilhado pelo professor e acompanhe legenda, Avatar Libras e resumo em uma tela preparada para leitura."
        visual={<LibrasLiveRealisticVisual variant="student" decorative className="h-56 w-full" />}
      />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,760px)_360px] lg:justify-center">
        <StudentJoinForm />
        <aside className="grid gap-4 self-start">
          <div className="rounded-lg bg-white p-5 shadow-soft dark:bg-zinc-900">
            <h2 className="text-2xl font-black text-ink dark:text-white">Acesso pelo celular</h2>
            <p className="mt-3 font-semibold leading-relaxed text-ink/75 dark:text-white/75">
              Use o código mostrado pelo professor ou leia o QR Code. Não é necessário criar conta para assistir à aula.
            </p>
            {demoMode && (
              <Link className="focus-ring mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber px-4 py-3 font-black text-ink" href="/join/AULA-4821">
                Abrir demonstração
              </Link>
            )}
          </div>
          <InstallPWAButton />
          <InstitutionalNotice />
        </aside>
      </div>
      <AppFooter />
    </main>
  );
}
