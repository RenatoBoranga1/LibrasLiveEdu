import type { IllustrationProps } from "./types";

export function StudentExperienceIllustration({ title = "Estudante acompanhando legenda e Avatar Libras no celular", decorative = false, className, ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 520 340" className={className} role={decorative ? undefined : "img"} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : title} {...props}>
      <rect x="28" y="34" width="464" height="274" rx="24" fill="#cbeedd" />
      <circle cx="118" cy="102" r="50" fill="#d38c62" />
      <path d="M68 102c0-46 22-70 52-70 36 0 55 27 50 72-23-10-42-25-54-43-10 19-26 33-48 41Z" fill="#142a3b" />
      <path d="M48 287c3-108 28-164 73-164s71 56 74 164H48Z" fill="#075e66" />
      <circle cx="101" cy="104" r="4" fill="#142a3b" />
      <circle cx="134" cy="104" r="4" fill="#142a3b" />
      <path d="M106 124c8 6 17 6 24 0" fill="none" stroke="#7d3e2e" strokeLinecap="round" strokeWidth="4" />
      <rect x="190" y="58" width="270" height="230" rx="20" fill="#12304a" />
      <rect x="210" y="80" width="230" height="94" rx="10" fill="#fff" />
      <text x="230" y="109" fill="#142a3b" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800">Legenda ao vivo</text>
      <rect x="230" y="124" width="173" height="9" rx="4.5" fill="#075e66" />
      <rect x="230" y="143" width="132" height="8" rx="4" fill="#9fb3bf" />
      <rect x="210" y="190" width="106" height="76" rx="10" fill="#dceef4" />
      <circle cx="263" cy="218" r="16" fill="#e9aa77" />
      <path d="M239 254c2-23 11-34 24-34s22 11 24 34h-48Z" fill="#075e66" />
      <rect x="330" y="190" width="110" height="76" rx="10" fill="#f8e7bd" />
      <path d="M350 213h70M350 231h53M350 249h62" stroke="#986b2e" strokeLinecap="round" strokeWidth="7" opacity=".72" />
      <circle cx="325" cy="69" r="4" fill="#59d4c2" />
    </svg>
  );
}
