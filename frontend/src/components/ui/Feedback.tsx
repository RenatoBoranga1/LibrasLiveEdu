import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type FeedbackVariant = "info" | "success" | "warning" | "error";
const styles = { info: "border-ocean/20 bg-sky/60 text-ink", success: "border-ocean/20 bg-mint text-ink", warning: "border-amber-strong/25 bg-amber/40 text-ink", error: "border-red-300 bg-red-100 text-red-950" } as const;
const icons = { info: Info, success: CheckCircle2, warning: TriangleAlert, error: AlertCircle } as const;

export function InlineFeedback({ variant = "info", title, children, className }: { variant?: FeedbackVariant; title?: string; children: ReactNode; className?: string }) {
  const Icon = icons[variant];
  return <div role={variant === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm font-semibold leading-relaxed", styles[variant], className)}><Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div>{title ? <strong className="block font-extrabold">{title}</strong> : null}<div className={title ? "mt-1" : ""}>{children}</div></div></div>;
}
