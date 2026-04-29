import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <section className="mx-auto max-w-xl px-4 py-10">
        <div role="alert" className="rounded-lg border border-amber/30 bg-amber/15 p-6 text-ink shadow-soft dark:text-white">
          <h1 className="text-3xl font-black">Acesso não autorizado</h1>
          <p className="mt-3 font-semibold leading-relaxed">
            Seu perfil não tem permissão para esta área. Entre com uma conta adequada ou volte para a página inicial.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="focus-ring rounded-lg bg-ocean px-4 py-3 font-bold text-white" href="/login">
              Fazer login
            </Link>
            <Link className="focus-ring rounded-lg bg-white px-4 py-3 font-bold text-ocean shadow-soft" href="/">
              Voltar
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
