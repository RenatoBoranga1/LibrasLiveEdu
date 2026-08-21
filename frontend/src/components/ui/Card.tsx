import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "section" | "div";
  header?: ReactNode;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddings = { none: "", sm: "p-3", md: "p-5", lg: "p-6" } as const;

export function Card({ as: Element = "article", header, footer, padding = "md", className, children, ...props }: CardProps) {
  return (
    <Element className={cn("overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900", className)} {...props}>
      {header ? <div className="border-b border-ink/10 px-5 py-4 dark:border-white/10">{header}</div> : null}
      <div className={paddings[padding]}>{children}</div>
      {footer ? <div className="border-t border-ink/10 px-5 py-4 dark:border-white/10">{footer}</div> : null}
    </Element>
  );
}
