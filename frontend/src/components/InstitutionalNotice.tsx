import { ShieldCheck } from "lucide-react";

export function InstitutionalNotice() {
  return (
    <section className="rounded-lg border border-ocean/20 bg-white p-4 text-sm leading-relaxed shadow-soft dark:border-white/15 dark:bg-zinc-900">
      <div className="mb-2 flex items-center gap-2 font-semibold text-ocean dark:text-mint">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        Apoio à acessibilidade
      </div>
      <p>
        Esta ferramenta é um recurso de apoio à acessibilidade e à inclusão educacional. Ela não substitui intérpretes
        humanos de Libras em situações formais, mas oferece suporte complementar por meio de legenda em tempo real,
        avatar em Libras e recursos visuais.
      </p>
    </section>
  );
}
