import type { IllustrationProps } from "./types";

export function TeacherToolsIllustration({ title = "Ferramentas do professor para criar e acompanhar uma aula", decorative = false, className, ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 520 340" className={className} role={decorative ? undefined : "img"} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : title} {...props}>
      <rect x="30" y="36" width="460" height="270" rx="24" fill="#dceef4" />
      <rect x="62" y="64" width="284" height="210" rx="12" fill="#fff" stroke="#b9dbe4" strokeWidth="3" />
      <rect x="84" y="88" width="122" height="22" rx="7" fill="#12304a" />
      <rect x="84" y="132" width="238" height="48" rx="8" fill="#f7fafc" stroke="#d5e1e7" strokeWidth="2" />
      <circle cx="107" cy="156" r="10" fill="#59d4c2" />
      <rect x="126" y="147" width="150" height="8" rx="4" fill="#075e66" />
      <rect x="126" y="162" width="112" height="7" rx="3.5" fill="#9fb3bf" />
      <rect x="84" y="196" width="106" height="50" rx="8" fill="#cbeedd" />
      <rect x="206" y="196" width="116" height="50" rx="8" fill="#f8e7bd" />
      <g transform="translate(366 78)">
        <rect width="96" height="96" rx="12" fill="#fff" />
        <g fill="#12304a">
          <path d="M16 16h20v20H16zM60 16h20v20H60zM16 60h20v20H16z" />
          <path d="M45 18h7v7h-7zM43 32h11v11H43zM61 46h18v9H61zM45 59h9v20h-9zM62 64h18v16H62z" />
        </g>
      </g>
      <g transform="translate(352 194)">
        <rect width="112" height="80" rx="12" fill="#12304a" />
        <path d="M22 56V37M44 56V24M66 56V32M88 56V16" stroke="#59d4c2" strokeLinecap="round" strokeWidth="8" />
        <path d="M19 63h72" stroke="#fff" strokeLinecap="round" strokeWidth="4" opacity=".8" />
      </g>
    </svg>
  );
}
