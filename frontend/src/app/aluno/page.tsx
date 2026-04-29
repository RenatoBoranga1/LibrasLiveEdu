import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { InstitutionalNotice } from "@/components/InstitutionalNotice";
import { StudentJoinForm } from "@/components/StudentJoinForm";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export default function StudentEntryPage() {
  return (
    <main className="min-h-screen bg-paper dark:bg-zinc-950">
      <AppHeader />
      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        <StudentJoinForm />
        <aside className="grid gap-4 self-start">
          <div className="rounded-lg bg-white p-5 shadow-soft dark:bg-zinc-900">
            <h2 className="text-2xl font-black text-ink dark:text-white">Acesso pelo celular</h2>
            <p className="mt-3 font-semibold leading-relaxed text-ink/75 dark:text-white/75">
              Use o codigo mostrado pelo professor ou leia o QR Code. Nao e necessario criar conta para assistir a aula.
            </p>
            {demoMode && (
              <Link className="focus-ring mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-amber px-4 py-3 font-black text-ink" href="/join/AULA-4821">
                Abrir demonstracao
              </Link>
            )}
          </div>
          <InstallPWAButton />
          <InstitutionalNotice />
        </aside>
      </div>
    </main>
  );
}
