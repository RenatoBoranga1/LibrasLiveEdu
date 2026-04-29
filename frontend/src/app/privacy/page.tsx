import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 text-ink dark:text-white">
        <h1 className="text-4xl font-black">Privacidade e LGPD</h1>
        <p className="mt-4 text-lg font-semibold leading-relaxed">
          Este aplicativo pode processar transcricoes de aulas, palavras salvas e dados de uso para fins educacionais e de acessibilidade. Para criancas e adolescentes, o uso deve ocorrer com autorizacao da escola e/ou responsavel legal, conforme a politica da instituicao.
        </p>
        <div className="mt-6 grid gap-3">
          {[
            "Aluno anonimo nao precisa informar nome ou e-mail para assistir aula.",
            "Audio bruto nao e armazenado por padrao.",
            "Transcricoes possuem retencao configuravel, com padrao de 30 dias em producao.",
            "Tokens, rotas administrativas e dados sensiveis nao devem ser cacheados pela PWA.",
            "Dados podem ser apagados ou anonimizados quando solicitado."
          ].map((item) => (
            <p key={item} className="rounded-lg bg-white p-4 font-semibold shadow-soft dark:bg-zinc-900">{item}</p>
          ))}
        </div>
        <Link className="focus-ring mt-6 inline-flex rounded-lg bg-ocean px-4 py-3 font-bold text-white" href="/data-rights">
          Ver direitos de dados
        </Link>
      </article>
    </main>
  );
}
