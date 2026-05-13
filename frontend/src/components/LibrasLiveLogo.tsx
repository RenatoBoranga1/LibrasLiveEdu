import { LibrasLiveMascot } from "@/components/LibrasLiveMascot";

export function LibrasLiveLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-ocean/15 dark:bg-zinc-900 dark:ring-white/10">
        <LibrasLiveMascot size={50} variant="compact" decorative className="-mt-1" />
      </span>
      {!compact && (
        <span>
          <span className="block text-lg font-black text-ink dark:text-white">LibrasLive Edu</span>
          <span className="block text-xs font-semibold uppercase tracking-normal text-ocean dark:text-mint">
            educacao inclusiva ao vivo
          </span>
        </span>
      )}
    </span>
  );
}
