import { LibrasLiveIcon } from "@/components/LibrasLiveIcon";

export function LibrasLiveLogo({ compact = false, showTagline = true }: { compact?: boolean; showTagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LibrasLiveIcon size={46} decorative className="shrink-0 drop-shadow-sm" />
      {!compact && (
        <span className="min-w-0">
          <span className="sr-only">LibrasLive Edu</span>
          <span aria-hidden="true" className="block whitespace-nowrap text-lg font-extrabold leading-none text-ink dark:text-white">
            Libras<span className="text-ocean dark:text-mint-strong">Live</span> <span className="text-amber-strong">Edu</span>
          </span>
          {showTagline && (
            <span className="mt-1 block whitespace-nowrap text-[0.68rem] font-bold text-ink/58 dark:text-white/60">
              Educação inclusiva ao vivo
            </span>
          )}
        </span>
      )}
    </span>
  );
}
