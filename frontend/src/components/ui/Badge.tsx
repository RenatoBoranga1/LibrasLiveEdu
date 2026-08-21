import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger" | "pending" | "approved" | "review";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-zinc-100 text-ink/75 dark:bg-white/10 dark:text-white/75",
  info: "bg-sky text-ocean dark:bg-white/10 dark:text-mint",
  success: "bg-mint text-ink",
  warning: "bg-amber text-ink",
  danger: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  pending: "bg-amber/45 text-ink dark:text-white",
  approved: "bg-ocean text-white",
  review: "bg-sky text-ocean dark:bg-white/10 dark:text-mint",
};

export function Badge({ variant = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn("inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold", variants[variant], className)} {...props} />;
}
