import type { IllustrationProps } from "./types";

export function HeroInclusiveClassroom({
  title = "Professor e estudante usando legenda ao vivo e Avatar Libras",
  decorative = false,
  className,
  ...props
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 760 560"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      {...props}
    >
      <path d="M92 70h576c31 0 56 25 56 56v348c0 31-25 56-56 56H92c-31 0-56-25-56-56V126c0-31 25-56 56-56Z" fill="#dceef4" />
      <path d="M126 104h508c20 0 36 16 36 36v278c0 20-16 36-36 36H126c-20 0-36-16-36-36V140c0-20 16-36 36-36Z" fill="#fff" stroke="#b9dbe4" strokeWidth="3" />
      <rect x="121" y="136" width="218" height="32" rx="8" fill="#12304a" />
      <circle cx="140" cy="152" r="6" fill="#f3b84b" />
      <text x="154" y="158" fill="#fff" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700">Aula ao vivo</text>
      <rect x="121" y="190" width="332" height="76" rx="8" fill="#f7fafc" stroke="#d5e1e7" strokeWidth="2" />
      <rect x="143" y="211" width="235" height="12" rx="6" fill="#075e66" />
      <rect x="143" y="235" width="278" height="9" rx="4.5" fill="#9fb3bf" />
      <rect x="477" y="190" width="158" height="188" rx="8" fill="#12304a" />
      <rect x="493" y="208" width="126" height="104" rx="8" fill="#cbeedd" />
      <circle cx="556" cy="244" r="22" fill="#e9aa77" />
      <path d="M523 301c4-34 19-50 33-50s30 16 34 50h-67Z" fill="#075e66" />
      <path d="M516 337h80" stroke="#fff" strokeLinecap="round" strokeWidth="8" />
      <text x="516" y="361" fill="#fff" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="700">Avatar Libras</text>
      <rect x="121" y="290" width="332" height="88" rx="8" fill="#cbeedd" />
      <text x="143" y="319" fill="#142a3b" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800">Legenda em tempo real</text>
      <rect x="143" y="335" width="266" height="9" rx="4.5" fill="#075e66" opacity=".72" />
      <rect x="143" y="353" width="205" height="9" rx="4.5" fill="#075e66" opacity=".42" />

      <g transform="translate(32 186)">
        <circle cx="82" cy="65" r="42" fill="#e9aa77" />
        <path d="M42 63c0-38 20-58 43-58 30 0 47 21 45 59-17-12-31-23-42-37-10 17-25 29-46 36Z" fill="#253d55" />
        <path d="M27 237c3-83 23-130 58-130s56 47 59 130H27Z" fill="#075e66" />
        <path d="M91 146c38-2 62-20 72-52" fill="none" stroke="#e9aa77" strokeLinecap="round" strokeWidth="20" />
        <circle cx="168" cy="87" r="15" fill="#e9aa77" />
        <path d="M166 73v-24M174 75l12-20M158 75l-8-20" stroke="#e9aa77" strokeLinecap="round" strokeWidth="7" />
        <circle cx="69" cy="67" r="4" fill="#142a3b" />
        <circle cx="96" cy="67" r="4" fill="#142a3b" />
        <path d="M73 85c7 6 15 6 22 0" fill="none" stroke="#8b4530" strokeLinecap="round" strokeWidth="4" />
      </g>

      <g transform="translate(540 344)">
        <circle cx="78" cy="54" r="34" fill="#d38c62" />
        <path d="M45 52c2-33 18-49 36-49 21 0 36 17 34 50-17-7-31-17-41-29-6 13-16 22-29 28Z" fill="#142a3b" />
        <path d="M30 181c2-67 19-103 49-103s48 36 50 103H30Z" fill="#d96a4b" />
        <rect x="-1" y="115" width="164" height="102" rx="14" fill="#fff" stroke="#12304a" strokeWidth="5" />
        <rect x="15" y="132" width="132" height="58" rx="7" fill="#dceef4" />
        <rect x="33" y="148" width="82" height="8" rx="4" fill="#075e66" />
        <rect x="33" y="165" width="98" height="7" rx="3.5" fill="#7b96a6" />
        <circle cx="67" cy="57" r="3.5" fill="#142a3b" />
        <circle cx="89" cy="57" r="3.5" fill="#142a3b" />
        <path d="M70 73c5 4 11 4 16 0" fill="none" stroke="#7d3e2e" strokeLinecap="round" strokeWidth="3" />
      </g>
      <circle cx="688" cy="96" r="9" fill="#f3b84b" />
      <path d="M681 122c18 9 29 25 30 44M668 141c9 5 15 14 16 24" fill="none" stroke="#075e66" strokeLinecap="round" strokeWidth="7" />
    </svg>
  );
}
