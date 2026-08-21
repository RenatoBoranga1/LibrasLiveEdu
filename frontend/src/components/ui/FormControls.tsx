import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type FieldMeta = {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
};

const controlClass = "focus-ring touch-target mt-2 w-full rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-ink placeholder:text-ink/40 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-white/15 dark:bg-zinc-950 dark:text-white";

function FieldDescription({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (!hint && !error) return null;
  return <p id={id} className={cn("mt-1.5 text-xs font-semibold leading-relaxed", error ? "text-red-700 dark:text-red-200" : "text-ink/60 dark:text-white/60")}>{error || hint}</p>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldMeta>(function Input(
  { label, hint, error, hideLabel = false, id, className, ...props },
  ref
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  return <label className="block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor={controlId}>
    <span className={hideLabel ? "sr-only" : ""}>{label}</span>
    <input ref={ref} id={controlId} className={cn(controlClass, className)} aria-invalid={Boolean(error)} aria-describedby={hint || error ? descriptionId : undefined} {...props} />
    <FieldDescription id={descriptionId} hint={hint} error={error} />
  </label>;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldMeta>(function Select(
  { label, hint, error, hideLabel = false, id, className, children, ...props },
  ref
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  return <label className="block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor={controlId}>
    <span className={hideLabel ? "sr-only" : ""}>{label}</span>
    <select ref={ref} id={controlId} className={cn(controlClass, className)} aria-invalid={Boolean(error)} aria-describedby={hint || error ? descriptionId : undefined} {...props}>{children}</select>
    <FieldDescription id={descriptionId} hint={hint} error={error} />
  </label>;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldMeta>(function Textarea(
  { label, hint, error, hideLabel = false, id, className, ...props },
  ref
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  return <label className="block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor={controlId}>
    <span className={hideLabel ? "sr-only" : ""}>{label}</span>
    <textarea ref={ref} id={controlId} className={cn(controlClass, "min-h-28 resize-y", className)} aria-invalid={Boolean(error)} aria-describedby={hint || error ? descriptionId : undefined} {...props} />
    <FieldDescription id={descriptionId} hint={hint} error={error} />
  </label>;
});
