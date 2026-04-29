import Link from "next/link";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { AppHeader } from "@/components/AppHeader";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 text-ink dark:text-white">
        <h1 className="text-4xl font-black">Termos de uso</h1>
        <p className="mt-4 text-lg font-semibold leading-relaxed">
          O LibrasLive Edu e uma ferramenta de apoio educacional. A traducao automatica pode ter limitacoes e nunca deve ser tratada como substituta de interprete humano de Libras em situacoes formais.
        </p>
        <div className="mt-6 grid gap-3">
          <p className="rounded-lg bg-white p-4 font-semibold shadow-soft dark:bg-zinc-900">Use apenas fontes autorizadas para importar sinais.</p>
          <p className="rounded-lg bg-white p-4 font-semibold shadow-soft dark:bg-zinc-900">Nao envie dados sensiveis desnecessarios nas transcricoes.</p>
          <p className="rounded-lg bg-white p-4 font-semibold shadow-soft dark:bg-zinc-900">Escolas devem orientar professores, alunos e responsaveis antes do uso real.</p>
        </div>
        <div className="mt-6">
          <InstitutionalNotice />
        </div>
        <Link className="focus-ring mt-6 inline-flex rounded-lg bg-ocean px-4 py-3 font-bold text-white" href="/privacy">
          Ver politica de privacidade
        </Link>
      </article>
    </main>
  );
}
