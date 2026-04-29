import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function DataRightsPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 text-ink dark:text-white">
        <h1 className="text-4xl font-black">Direitos de dados</h1>
        <p className="mt-4 text-lg font-semibold leading-relaxed">
          Usuarios podem solicitar acesso, correcao, anonimização ou exclusao dos dados pessoais tratados pelo sistema, conforme a LGPD e a politica da instituicao.
        </p>
        <div className="mt-6 grid gap-3">
          <p className="rounded-lg bg-white p-4 font-semibold shadow-soft dark:bg-zinc-900">Alunos anonimos mantem palavras salvas no proprio dispositivo.</p>
          <p className="rounded-lg bg-white p-4 font-semibold shadow-soft dark:bg-zinc-900">Professores podem apagar ou anonimizar aulas e transcrições.</p>
          <p className="rounded-lg bg-white p-4 font-semibold shadow-soft dark:bg-zinc-900">Responsaveis podem solicitar revisao do consentimento quando aplicavel.</p>
        </div>
        <Link className="focus-ring mt-6 inline-flex rounded-lg bg-ocean px-4 py-3 font-bold text-white" href="/profile">
          Ir para meu perfil
        </Link>
      </article>
    </main>
  );
}
