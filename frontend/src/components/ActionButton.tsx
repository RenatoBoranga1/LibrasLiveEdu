import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "primary" | "secondary" | "quiet" | "danger";
};

const tones = {
  primary: "bg-ocean text-white hover:bg-teal-800",
  secondary: "bg-yellow-400 text-ink hover:bg-yellow-300",
  quiet: "bg-white text-ink border border-ink/10 hover:border-ocean/40 dark:bg-zinc-900 dark:text-white dark:border-white/10",
  danger: "bg-red-700 text-white hover:bg-red-800"
};

export function ActionButton({ children, tone = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
