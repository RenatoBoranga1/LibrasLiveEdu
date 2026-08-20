import type { IllustrationProps } from "./types";

export function SignCurationIllustration({ title = "Curadoria de mídias de Libras com revisão e aprovação", decorative = false, className, ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 520 340" className={className} role={decorative ? undefined : "img"} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : title} {...props}>
      <rect x="28" y="34" width="464" height="274" rx="24" fill="#f8e7bd" />
      <rect x="58" y="62" width="404" height="220" rx="14" fill="#fff" stroke="#ead5a6" strokeWidth="3" />
      <rect x="82" y="85" width="146" height="18" rx="6" fill="#12304a" />
      <g transform="translate(82 126)">
        <rect width="116" height="112" rx="10" fill="#12304a" />
        <circle cx="58" cy="46" r="18" fill="#e9aa77" />
        <path d="M31 90c3-35 13-52 27-52s25 17 28 52H31Z" fill="#59d4c2" />
        <circle cx="96" cy="92" r="14" fill="#fff" />
        <path d="m89 92 5 5 9-11" fill="none" stroke="#075e66" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      </g>
      <g transform="translate(218 126)">
        <rect width="214" height="32" rx="8" fill="#f7fafc" />
        <circle cx="18" cy="16" r="7" fill="#59d4c2" />
        <rect x="34" y="11" width="116" height="8" rx="4" fill="#075e66" />
        <rect y="48" width="214" height="32" rx="8" fill="#f7fafc" />
        <circle cx="18" cy="64" r="7" fill="#f3b84b" />
        <rect x="34" y="59" width="142" height="8" rx="4" fill="#7b96a6" />
        <rect y="96" width="96" height="34" rx="8" fill="#075e66" />
        <path d="m22 113 8 8 15-18" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
        <text x="54" y="118" fill="#fff" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700">Revisar</text>
      </g>
    </svg>
  );
}
