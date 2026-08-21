import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageShell({ children, className, width = "wide" }: { children: ReactNode; className?: string; width?: "narrow" | "default" | "wide" | "full" }) {
  const widths = { narrow: "max-w-3xl", default: "max-w-5xl", wide: "max-w-7xl", full: "max-w-none" };
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-6", widths[width], className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; className?: string }) {
  return <header className={cn("flex flex-col gap-5 border-b border-ink/10 pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between", className)}><div className="max-w-3xl">{eyebrow ? <p className="text-sm font-extrabold text-ocean dark:text-mint">{eyebrow}</p> : null}<h1 className="mt-1 text-3xl font-extrabold leading-tight text-ink dark:text-white sm:text-4xl">{title}</h1>{description ? <p className="mt-3 text-base font-medium leading-relaxed text-ink/65 dark:text-white/65">{description}</p> : null}</div>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</header>;
}

export function Section({ title, description, actions, children, className, ...props }: HTMLAttributes<HTMLElement> & { title?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <section className={cn("py-6", className)} {...props}>{title || description || actions ? <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div>{title ? <h2 className="text-xl font-extrabold text-ink dark:text-white">{title}</h2> : null}{description ? <p className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-ink/62 dark:text-white/62">{description}</p> : null}</div>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</header> : null}{children}</section>;
}
