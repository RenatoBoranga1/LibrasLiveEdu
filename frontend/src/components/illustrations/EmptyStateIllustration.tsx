import type { IllustrationProps } from "./types";

export function EmptyStateIllustration({ title = "Aguardando novo conteúdo", decorative = false, className, ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 260 180" className={className} role={decorative ? undefined : "img"} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : title} {...props}>
      <rect x="18" y="20" width="224" height="140" rx="24" fill="#dceef4" />
      <path d="M70 61h120c13 0 24 11 24 24v28c0 13-11 24-24 24h-62l-31 20 7-20H70c-13 0-24-11-24-24V85c0-13 11-24 24-24Z" fill="#fff" stroke="#b9dbe4" strokeWidth="3" />
      <circle cx="96" cy="101" r="8" fill="#075e66" />
      <circle cx="130" cy="101" r="8" fill="#59d4c2" />
      <circle cx="164" cy="101" r="8" fill="#f3b84b" />
    </svg>
  );
}
