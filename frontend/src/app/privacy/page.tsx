import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 text-ink dark:text-white">
        <h1 className="text-4xl font-black">Privacidade e LGPD</h1>
        <p className="mt-4 text-lg font-semibold leading-relaxed">
          Este aplicativo pode processar transcrições de aulas, palavras salvas e dados de uso para fins educacionais e de acessibilidade. Para crianças e adolescentes, o uso deve ocorrer com autorização da escola e/ou responsável legal, conforme a política da instituição.
        </p>
        <div className="mt-6 grid gap-3">
          {[
            "Aluno anônimo não precisa informar nome ou e-mail para assistir aula.",
            "Áudio bruto não é armazenado por padrão.",
            "Transcrições possuem retenção configurável, com padrão de 30 dias em produção.",
            "Tokens, rotas administrativas e dados sensíveis não devem ser cacheados pela PWA.",
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
