import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "primary" | "secondary" | "quiet" | "danger";
};

const tones: Record<NonNullable<Props["tone"]>, ButtonVariant> = {
  primary: "primary",
  secondary: "warning",
  quiet: "secondary",
  danger: "danger",
};

export function ActionButton({ children, tone = "primary", className = "", type = "submit", ...props }: Props) {
  return (
    <Button variant={tones[tone]} size="lg" className={className} type={type} {...props}>
      {children}
    </Button>
  );
}
