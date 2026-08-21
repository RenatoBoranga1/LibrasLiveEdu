import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "warning" | "success";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ocean text-white shadow-sm hover:bg-ink",
  secondary: "border border-ink/12 bg-white text-ocean hover:border-ocean/35 hover:bg-sky/45 dark:border-white/15 dark:bg-zinc-900 dark:text-mint",
  ghost: "bg-transparent text-ink/75 hover:bg-ink/5 hover:text-ocean dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-mint",
  danger: "bg-red-700 text-white hover:bg-red-800",
  warning: "bg-amber text-ink hover:bg-amber/70",
  success: "bg-mint text-ink hover:bg-mint-strong",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 py-2 text-sm",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-base",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "focus-ring inline-flex touch-target items-center justify-center gap-2 rounded-lg font-extrabold transition disabled:cursor-not-allowed disabled:opacity-55",
    variants[variant],
    sizes[size],
    className
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
