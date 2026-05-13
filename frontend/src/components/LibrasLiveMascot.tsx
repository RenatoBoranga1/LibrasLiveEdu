"use client";

import { useId, type SVGProps } from "react";

type MascotVariant = "hero" | "compact" | "welcome" | "empty" | "avatar";

type LibrasLiveMascotProps = Omit<SVGProps<SVGSVGElement>, "role"> & {
  size?: number;
  variant?: MascotVariant;
  ariaLabel?: string;
  decorative?: boolean;
};

export function LibrasLiveMascot({
  size = 240,
  className,
  variant = "hero",
  ariaLabel = "Liva, mascote profissional do LibrasLive Edu sinalizando em Libras",
  decorative = false,
  ...props
}: LibrasLiveMascotProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const labelId = decorative ? undefined : `${id}-title`;
  const descId = decorative ? undefined : `${id}-desc`;
  const bgId = `${id}-bg`;
  const shirtId = `${id}-shirt`;
  const hairId = `${id}-hair`;
  const skinId = `${id}-skin`;
  const handId = `${id}-hand`;
  const compact = variant === "compact";
  const empty = variant === "empty";
  const welcome = variant === "welcome";
  const avatar = variant === "avatar";
  const showBubble = variant === "hero" || welcome || empty;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 420"
      width={size}
      height={size}
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : `${labelId} ${descId}`}
      {...props}
    >
      {!decorative && (
        <>
          <title id={labelId}>{ariaLabel}</title>
          <desc id={descId}>
            Ilustracao vetorial original inspirada em uma interprete digital acolhedora, com maos em destaque, baloon de fala e ondas ao vivo.
          </desc>
        </>
      )}
      <defs>
        <linearGradient id={bgId} x1="34" x2="374" y1="30" y2="374" gradientUnits="userSpaceOnUse">
          <stop stopColor={empty ? "#fffbeb" : "#ecfeff"} />
          <stop offset="1" stopColor={empty ? "#fde68a" : "#ccfbf1"} />
        </linearGradient>
        <linearGradient id={shirtId} x1="138" x2="282" y1="232" y2="390" gradientUnits="userSpaceOnUse">
          <stop stopColor="#123866" />
          <stop offset="1" stopColor="#071f3d" />
        </linearGradient>
        <linearGradient id={hairId} x1="118" x2="276" y1="50" y2="205" gradientUnits="userSpaceOnUse">
          <stop stopColor="#172b52" />
          <stop offset=".62" stopColor="#081a33" />
          <stop offset="1" stopColor="#020817" />
        </linearGradient>
        <linearGradient id={skinId} x1="148" x2="248" y1="104" y2="220" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd5a5" />
          <stop offset="1" stopColor="#f2a56d" />
        </linearGradient>
        <linearGradient id={handId} x1="72" x2="280" y1="150" y2="326" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd8aa" />
          <stop offset="1" stopColor="#f2a163" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-18%" y="-18%" width="136%" height="148%">
          <feDropShadow dx="0" dy="16" stdDeviation="15" floodColor="#020817" floodOpacity=".18" />
        </filter>
      </defs>

      {compact ? (
        <g filter={`url(#${id}-shadow)`}>
          <rect x="56" y="56" width="308" height="308" rx="72" fill="#071f3d" />
          <path
            d="M114 199c0-65 52-118 116-118 25 0 48 8 67 22"
            fill="none"
            stroke="#41dfd0"
            strokeLinecap="round"
            strokeWidth="24"
          />
          <path
            d="M300 276c-22 24-53 39-88 39h-31l-54 38c-11 8-26-2-22-16l14-46c-19-22-30-51-30-82"
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="24"
          />
          <path
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="3"
            d="M151 205v-61c0-12 10-22 22-22s22 10 22 22v43-57c0-12 10-22 22-22s22 10 22 22v62-49c0-12 10-22 22-22s22 10 22 22v75c0 49-40 89-89 89h-7c-38 0-68-30-68-68v-22c0-13 10-23 23-23 4 0 7 1 9 2Z"
          />
          <g fill="none" stroke="#41dfd0" strokeLinecap="round" strokeWidth="14">
            <path d="M314 124c20 14 31 34 31 59" />
            <path d="M278 145c13 9 20 23 20 39" />
          </g>
        </g>
      ) : (
        <>
          <rect x="32" y="28" width="356" height="360" rx="64" fill={`url(#${bgId})`} />
          {showBubble && (
            <g filter={`url(#${id}-shadow)`}>
              <path
                fill="#ffffff"
                stroke="#d7f7f3"
                strokeWidth="2"
                d="M230 62h92c27 0 49 22 49 49v72c0 27-22 49-49 49h-48l-39 34c-9 8-23 1-22-11l4-29c-22-6-37-26-37-49v-66c0-27 22-49 50-49Z"
              />
              <path d="M242 143h76M242 174h48" stroke="#0f766e" strokeLinecap="round" strokeWidth="11" />
            </g>
          )}

          <g fill="none" stroke="#10bfae" strokeLinecap="round" strokeWidth={avatar ? 9 : 12}>
            <path d="M338 74c24 16 39 42 39 74" />
            <path d="M311 103c14 10 23 26 23 45" />
          </g>

          <g filter={`url(#${id}-shadow)`}>
            <path
              fill={`url(#${shirtId})`}
              d="M115 386c6-77 38-126 96-126h5c58 0 91 49 98 126H115Z"
            />
            <path fill="#0d9488" d="M161 266h106l-52 50-54-50Z" opacity=".9" />
            <path fill="#08223f" d="M174 268c8 27 22 48 41 63 18-15 32-36 40-63h-81Z" />
            <path d="M152 306h122" stroke="#10bfae" strokeLinecap="round" strokeWidth="8" />
            <circle cx="286" cy="314" r="24" fill="#0f766e" />
            <path
              d="M274 315c0-12 10-22 22-22 6 0 11 2 15 6M309 325c-5 6-13 10-22 10h-8l-12 8 4-13"
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
            />
            <path d="M286 309v-15M296 314v-18M305 319v-15" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" />
          </g>

          <g filter={`url(#${id}-shadow)`}>
            <path
              fill={`url(#${hairId})`}
              d="M111 176c-9-59 28-119 92-127 50-7 92 22 105 67 15 51-11 106-49 126-17 9-46 7-62 0-55-24-79-19-86-66Z"
            />
            <path
              fill="#203d6f"
              d="M114 151c20-51 58-84 112-91 30-4 58 6 77 27-24-5-49-1-74 14-37 22-70 37-115 50Z"
              opacity=".9"
            />
            <path
              fill={`url(#${skinId})`}
              stroke="#8b4a2b"
              strokeOpacity=".18"
              strokeWidth="2"
              d="M137 153c0-45 34-81 76-81s76 36 76 81v30c0 45-34 81-76 81s-76-36-76-81v-30Z"
            />
            <path
              fill={`url(#${hairId})`}
              d="M128 140c12-48 47-76 97-86 28 18 52 35 67 74-45-22-82-20-111 4-15 13-31 16-53 8Z"
            />
            <path d="M163 151c13-8 27-8 38 0M226 151c12-8 26-8 38 0" stroke="#06152b" strokeLinecap="round" strokeWidth="6" />
            <circle cx="181" cy="170" r="9" fill="#071f3d" />
            <circle cx="244" cy="170" r="9" fill="#071f3d" />
            <circle cx="185" cy="166" r="3" fill="#ffffff" />
            <circle cx="248" cy="166" r="3" fill="#ffffff" />
            <path d="M199 208c13 13 34 13 47 0" fill="none" stroke="#7c2d12" strokeLinecap="round" strokeWidth="6" />
            <path d="M206 219c10 6 25 6 35 0" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="3" />
            <circle cx="133" cy="177" r="13" fill="#f2a163" />
            <circle cx="292" cy="177" r="13" fill="#f2a163" />
            <circle cx="127" cy="185" r="7" fill="#0d9488" />
            <circle cx="299" cy="185" r="7" fill="#0d9488" />
          </g>

          <g filter={`url(#${id}-shadow)`}>
            <path
              fill={`url(#${handId})`}
              d="M74 287c-20-17-32-42-32-69v-42c0-11 9-20 20-20s20 9 20 20v49-73c0-11 9-20 20-20s20 9 20 20v73-63c0-11 9-20 20-20s20 9 20 20v72-40c0-11 9-20 20-20s20 9 20 20v45c0 56-42 101-94 101-20 0-38-6-54-17Z"
            />
            <path d="M82 225v-72M122 225v-83M162 226v-72M198 241v-52" stroke="#c86f3d" strokeLinecap="round" strokeWidth="4" opacity=".5" />
            <path
              fill={`url(#${handId})`}
              d="M231 311c20-9 45-22 72-40 11-7 25-4 33 7 8 12 5 27-7 35l-60 38c-22 14-49 17-73 7l-32-13c-13-5-18-20-13-32 5-13 20-19 32-14l36 15c4 2 8 1 12-3Z"
            />
            <path
              fill={`url(#${handId})`}
              d="M253 287c12-10 26-21 42-34 10-8 25-7 33 3s7 25-3 33l-52 42c-10 8-25 7-33-3s-7-25 3-33l10-8Z"
            />
            <path d="M207 335c38 19 78-5 119-40" stroke="#c86f3d" strokeLinecap="round" strokeWidth="4" opacity=".45" />
          </g>

          {empty && (
            <g>
              <circle cx="71" cy="86" r="17" fill="#f59e0b" />
              <path d="M71 77v14" stroke="#ffffff" strokeLinecap="round" strokeWidth="6" />
              <circle cx="71" cy="99" r="3" fill="#ffffff" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
