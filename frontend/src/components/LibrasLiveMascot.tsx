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
  size = 220,
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
  const mintId = `${id}-mint`;
  const panelId = `${id}-panel`;
  const compact = variant === "compact";
  const empty = variant === "empty";
  const welcome = variant === "welcome";
  const avatar = variant === "avatar";
  const showPanel = !compact;
  const showCaption = variant === "hero" || welcome || empty;
  const accentColor = empty ? "#d97706" : "#f59e0b";
  const panelFill = empty ? "#fffbeb" : "#ffffff";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 360"
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
            Mascote vetorial original com rosto discreto, maos em destaque, painel de legenda e ondas de comunicacao ao vivo.
          </desc>
        </>
      )}
      <defs>
        <linearGradient id={bgId} x1="54" x2="314" y1="52" y2="316" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={empty ? "#fef3c7" : "#e6fffa"} />
          <stop offset="1" stopColor={empty ? "#fde68a" : "#ccfbf1"} />
        </linearGradient>
        <linearGradient id={mintId} x1="106" x2="252" y1="116" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#99f6e4" />
        </linearGradient>
        <linearGradient id={panelId} x1="65" x2="300" y1="58" y2="292" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={panelFill} />
          <stop offset="1" stopColor={empty ? "#fef3c7" : "#f8fafc"} />
        </linearGradient>
        <filter id={`${id}-soft-shadow`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#0f172a" floodOpacity=".18" />
        </filter>
      </defs>

      <rect x="42" y="40" width="276" height="280" rx="54" fill={`url(#${bgId})`} />

      {showPanel && (
        <g filter={`url(#${id}-soft-shadow)`}>
          <path
            fill={`url(#${panelId})`}
            stroke="#0f766e"
            strokeOpacity=".18"
            strokeWidth="2"
            d="M72 77c0-16 13-29 29-29h158c16 0 29 13 29 29v116c0 16-13 29-29 29h-52l-41 35c-9 7-22 1-22-11v-24h-43c-16 0-29-13-29-29V77Z"
          />
        </g>
      )}

      {(variant === "hero" || welcome || avatar) && (
        <g fill="none" stroke={accentColor} strokeLinecap="round" strokeWidth={compact ? 8 : 10}>
          <path d="M286 86c19 13 31 34 31 59" />
          <path d="M309 57c31 22 48 53 48 91" />
        </g>
      )}

      {showCaption && (
        <g>
          <rect x="84" y="248" width="192" height="44" rx="18" fill="#0f766e" />
          <path d="M111 270h56M188 270h61" stroke="#ccfbf1" strokeLinecap="round" strokeWidth="8" />
        </g>
      )}

      <g filter={`url(#${id}-soft-shadow)`}>
        <path
          fill="#0f172a"
          fillOpacity=".10"
          d="M103 302c0-22 35-40 78-40s78 18 78 40c0 11-35 19-78 19s-78-8-78-19Z"
        />
        <path
          fill={`url(#${mintId})`}
          stroke="#064e3b"
          strokeLinejoin="round"
          strokeWidth={compact ? 7 : 8}
          d="M121 227c0-38 27-68 60-68s60 30 60 68v34c0 18-14 32-32 32h-56c-18 0-32-14-32-32v-34Z"
        />
        <path fill="#0f766e" d="M133 220c9-28 26-43 48-43s39 15 48 43c-13 10-29 16-48 16s-35-6-48-16Z" opacity=".14" />
        <circle cx="181" cy="127" r="44" fill="#f8fafc" stroke="#064e3b" strokeWidth={compact ? 7 : 8} />
        <path
          fill="#0f766e"
          d="M139 125c4-34 28-57 61-57 21 0 36 9 46 25-10 25-35 40-69 40-14 0-27-3-38-8Z"
        />
        <circle cx="163" cy="132" r="4.5" fill="#064e3b" />
        <circle cx="199" cy="132" r="4.5" fill="#064e3b" />
        <path d="M168 150c8 7 18 7 26 0" fill="none" stroke="#064e3b" strokeLinecap="round" strokeWidth="5" />
        <path d="M149 195h64" fill="none" stroke={accentColor} strokeLinecap="round" strokeWidth="8" />
      </g>

      <g>
        <path
          fill="#f8fafc"
          stroke="#064e3b"
          strokeLinejoin="round"
          strokeWidth={compact ? 6 : 7}
          d="M88 224v-50c0-12 10-22 22-22s22 10 22 22v31l9-17c6-11 20-15 31-9s15 20 9 31l-22 40c-9 17-27 28-46 28h-10c-19 0-34-15-34-34v-14c0-12 10-21 22-21 4 0 8 1 11 3Z"
        />
        <path d="M111 208v-46M132 205v-34M154 187l8-16" fill="none" stroke="#064e3b" strokeLinecap="round" strokeWidth={compact ? 7 : 8} />
        <path
          fill="#f8fafc"
          stroke="#064e3b"
          strokeLinejoin="round"
          strokeWidth={compact ? 6 : 7}
          d="M272 224v-50c0-12-10-22-22-22s-22 10-22 22v31l-9-17c-6-11-20-15-31-9s-15 20-9 31l22 40c9 17 27 28 46 28h10c19 0 34-15 34-34v-14c0-12-10-21-22-21-4 0-8 1-11 3Z"
        />
        <path d="M249 208v-46M228 205v-34M206 187l-8-16" fill="none" stroke="#064e3b" strokeLinecap="round" strokeWidth={compact ? 7 : 8} />
      </g>

      {empty && (
        <g>
          <circle cx="86" cy="82" r="15" fill={accentColor} />
          <path d="M86 73v12" stroke="#ffffff" strokeLinecap="round" strokeWidth="6" />
          <circle cx="86" cy="93" r="3" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}
