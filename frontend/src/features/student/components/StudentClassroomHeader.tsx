import { HelpButton } from "@/components/HelpButton";
import { LibrasLiveLogo } from "@/components/LibrasLiveLogo";

export function StudentClassroomHeader({ title, loading, connected, connectionLabel }: { title?: string; loading: boolean; connected: boolean; connectionLabel: string }) {
  return <header className="sticky top-0 z-20 w-full max-w-full overflow-hidden border-b border-ink/10 bg-paper/95 py-2 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3"><LibrasLiveLogo compact /><div className="min-w-0"><p className="text-xs font-bold text-ocean dark:text-mint">Ambiente do aluno</p><h1 className="truncate text-base font-black leading-tight sm:text-lg">{loading ? "Entrando na aula..." : title ?? "Aula"}</h1><p className="text-xs font-semibold text-ink/60 dark:text-white/60">Legenda ao vivo e apoio visual em Libras</p></div></div>
      <div className="flex shrink-0 items-center gap-2"><span className={`hidden min-h-9 items-center gap-2 rounded-full px-3 py-1 text-xs font-black sm:inline-flex ${connected ? "bg-mint text-ink" : "bg-amber/40 text-ink dark:text-white"}`} role="status"><span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-ocean" : "bg-amber-strong"}`} aria-hidden="true" />{connectionLabel}</span><HelpButton /></div>
    </div>
  </header>;
}
