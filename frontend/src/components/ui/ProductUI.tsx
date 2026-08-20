import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LibrasLiveIcon } from "@/components/LibrasLiveIcon";

export function AppSection({
  id,
  eyebrow,
  title,
  description,
  tone = "default",
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  tone?: "default" | "soft" | "dark";
  children: ReactNode;
}) {
  const tones = {
    default: "bg-paper text-ink dark:bg-zinc-950 dark:text-white",
    soft: "bg-sky/55 text-ink dark:bg-zinc-900 dark:text-white",
    dark: "bg-ink text-white dark:bg-black",
  };

  return (
    <section id={id} className={`py-14 sm:py-18 ${tones[tone]}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {(eyebrow || title || description) && (
          <header className="mb-8 max-w-3xl">
            {eyebrow && <p className={`text-sm font-extrabold ${tone === "dark" ? "text-mint-strong" : "text-ocean dark:text-mint-strong"}`}>{eyebrow}</p>}
            {title && <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h2>}
            {description && <p className={`mt-4 text-base font-medium leading-relaxed sm:text-lg ${tone === "dark" ? "text-white/72" : "text-ink/68 dark:text-white/68"}`}>{description}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export function FeatureCard({ icon: Icon, title, description, accent = "ocean" }: { icon: LucideIcon; title: string; description: string; accent?: "ocean" | "amber" | "coral" }) {
  const accents = {
    ocean: "bg-sky text-ocean dark:bg-white/10 dark:text-mint-strong",
    amber: "bg-amber text-amber-strong dark:bg-amber/15 dark:text-amber",
    coral: "bg-red-50 text-coral dark:bg-red-950/30 dark:text-red-200",
  };
  return (
    <article className="h-full rounded-lg border border-ink/10 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-ocean/25 dark:border-white/10 dark:bg-zinc-900">
      <span className={`grid h-11 w-11 place-items-center rounded-lg ${accents[accent]}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink/66 dark:text-white/66">{description}</p>
    </article>
  );
}

export function PageHero({ eyebrow, title, description, actions, visual }: { eyebrow: string; title: string; description: string; actions?: ReactNode; visual?: ReactNode }) {
  return (
    <section className="border-b border-ink/10 bg-white dark:border-white/10 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:items-center">
        <div className="max-w-3xl">
          <p className="text-sm font-extrabold text-ocean dark:text-mint-strong">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink dark:text-white sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-ink/68 dark:text-white/68 sm:text-lg">{description}</p>
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {visual && <div className="hidden max-h-56 overflow-hidden rounded-lg border border-ink/10 bg-sky/45 p-3 dark:border-white/10 dark:bg-white/5 lg:block" aria-hidden="true">{visual}</div>}
      </div>
    </section>
  );
}

export function InfoBadge({ children, tone = "ocean" }: { children: ReactNode; tone?: "ocean" | "amber" | "neutral" }) {
  const tones = {
    ocean: "bg-sky text-ocean dark:bg-white/10 dark:text-mint-strong",
    amber: "bg-amber text-amber-strong dark:bg-amber/15 dark:text-amber",
    neutral: "bg-zinc-100 text-ink/70 dark:bg-white/10 dark:text-white/70",
  };
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-xs font-extrabold ${tones[tone]}`}>{children}</span>;
}

export function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <p className="text-xs font-extrabold uppercase text-ink/58 dark:text-white/58">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-ocean dark:text-mint-strong">{value}</p>
      {detail && <p className="mt-1 text-xs font-medium text-ink/55 dark:text-white/55">{detail}</p>}
    </article>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-ocean/25 bg-sky/35 p-6 text-center dark:border-white/15 dark:bg-white/5">
      <div className="max-w-md">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-lg bg-white shadow-soft dark:bg-zinc-900">
          <LibrasLiveIcon size={56} decorative />
        </span>
        <h3 className="mt-3 text-xl font-extrabold text-ink dark:text-white">{title}</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink/65 dark:text-white/65">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
