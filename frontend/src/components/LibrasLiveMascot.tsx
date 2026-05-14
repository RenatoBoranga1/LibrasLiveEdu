"use client";

import { useId, type SVGProps } from "react";

type MascotVariant =
  | "hero"
  | "compact"
  | "welcome"
  | "learning"
  | "communication"
  | "inclusion"
  | "live"
  | "empty"
  | "avatar";

type LibrasLiveMascotProps = Omit<SVGProps<SVGSVGElement>, "role"> & {
  size?: number;
  variant?: MascotVariant;
  ariaLabel?: string;
  decorative?: boolean;
};

const bubbleText: Record<Exclude<MascotVariant, "compact">, { top: string; bottom: string }> = {
  hero: { top: "Seja", bottom: "bem-vindo!" },
  welcome: { top: "Seja", bottom: "bem-vindo!" },
  learning: { top: "Aprender", bottom: "com acesso" },
  communication: { top: "Comunicacao", bottom: "visual" },
  inclusion: { top: "Inclusao", bottom: "na aula" },
  live: { top: "Ao vivo", bottom: "agora" },
  empty: { top: "Aguardando", bottom: "sinal" },
  avatar: { top: "Avatar", bottom: "Libras" },
};

export function LibrasLiveMascot({
  size = 420,
  className,
  variant = "hero",
  ariaLabel = "Liva, mascote profissional do LibrasLive Edu sinalizando em Libras",
  decorative = false,
  ...props
}: LibrasLiveMascotProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const labelId = decorative ? undefined : `${id}-title`;
  const descId = decorative ? undefined : `${id}-desc`;
  const compact = variant === "compact";
  const fullVariant: Exclude<MascotVariant, "compact"> = compact ? "hero" : variant;
  const text = bubbleText[fullVariant];
  const height = compact ? size : Math.round(size * 520 / 760);

  if (compact) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
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
            <desc id={descId}>Icone com mao branca, balao circular, arco mint e ondas ao vivo sobre fundo azul.</desc>
          </>
        )}
        <defs>
          <linearGradient id={`${id}-icon-bg`} x1="87" x2="425" y1="70" y2="452" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1d3e70" />
            <stop offset=".56" stopColor="#0a2a52" />
            <stop offset="1" stopColor="#061a34" />
          </linearGradient>
          <linearGradient id={`${id}-icon-mint`} x1="130" x2="383" y1="115" y2="333" gradientUnits="userSpaceOnUse">
            <stop stopColor="#81fff0" />
            <stop offset="1" stopColor="#10b9ad" />
          </linearGradient>
          <filter id={`${id}-icon-shadow`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#020817" floodOpacity=".30" />
          </filter>
          <filter id={`${id}-glyph-shadow`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#020817" floodOpacity=".22" />
          </filter>
        </defs>
        <rect x="58" y="58" width="396" height="396" rx="88" fill={`url(#${id}-icon-bg)`} filter={`url(#${id}-icon-shadow)`} />
        <rect x="65" y="65" width="382" height="382" rx="80" fill="none" stroke="#ffffff" strokeOpacity=".10" strokeWidth="4" />
        <g filter={`url(#${id}-glyph-shadow)`}>
          <path d="M140 255c0-71 58-129 129-129 26 0 50 8 70 21" fill="none" stroke={`url(#${id}-icon-mint)`} strokeLinecap="round" strokeWidth="25" />
          <path d="M357 236c25 39 20 89-12 124-32 36-83 49-129 35h-30l-67 48 19-68c-25-31-38-70-33-111" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="25" />
          <path fill="#ffffff" stroke="#e7eef7" strokeWidth="3" d="M172 258v-82c0-14 11-25 25-25s25 11 25 25v61-84c0-14 11-25 25-25s25 11 25 25v85-67c0-14 11-25 25-25s25 11 25 25v98c0 57-46 103-103 103h-10c-44 0-79-35-79-79v-30c0-14 11-25 25-25 6 0 12 2 17 6Z" />
          <path d="M197 256v-98M247 238v-96M297 246v-82" stroke="#d8e1ec" strokeLinecap="round" strokeWidth="6" />
          <path d="M356 124c27 18 43 48 43 82M321 149c16 12 26 30 26 51" fill="none" stroke={`url(#${id}-icon-mint)`} strokeLinecap="round" strokeWidth="18" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 760 520"
      width={size}
      height={height}
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : `${labelId} ${descId}`}
      {...props}
    >
      {!decorative && (
        <>
          <title id={labelId}>{ariaLabel}</title>
          <desc id={descId}>Mascote 3D estilizada com cabelo azul-marinho, uniforme azul, mao levantada, mao no peito e balao de boas-vindas.</desc>
        </>
      )}
      <defs>
        <linearGradient id={`${id}-mint-bg`} x1="86" x2="690" y1="40" y2="480" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f7ffff" />
          <stop offset=".58" stopColor="#e7fbf8" />
          <stop offset="1" stopColor="#d4f7f3" />
        </linearGradient>
        <linearGradient id={`${id}-hair`} x1="130" x2="390" y1="24" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#233f70" />
          <stop offset=".5" stopColor="#0c2242" />
          <stop offset="1" stopColor="#020817" />
        </linearGradient>
        <linearGradient id={`${id}-skin`} x1="145" x2="330" y1="118" y2="362" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffddb8" />
          <stop offset=".55" stopColor="#f4a66d" />
          <stop offset="1" stopColor="#de7f48" />
        </linearGradient>
        <linearGradient id={`${id}-shirt`} x1="142" x2="388" y1="298" y2="520" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16477c" />
          <stop offset=".55" stopColor="#0b2d57" />
          <stop offset="1" stopColor="#061529" />
        </linearGradient>
        <linearGradient id={`${id}-hand`} x1="34" x2="402" y1="170" y2="498" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffdfbd" />
          <stop offset=".68" stopColor="#f0a065" />
          <stop offset="1" stopColor="#d97945" />
        </linearGradient>
        <linearGradient id={`${id}-bubble`} x1="470" x2="730" y1="70" y2="286" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#f8fffe" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#0f172a" floodOpacity=".18" />
        </filter>
        <filter id={`${id}-soft-shadow`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f172a" floodOpacity=".12" />
        </filter>
      </defs>

      <rect width="760" height="520" rx="0" fill="#ffffff" />
      <path fill={`url(#${id}-mint-bg)`} d="M38 190c80-128 207-123 302-92 93 30 126-25 218-28 90-2 160 58 168 155 10 122-72 238-210 249-115 9-170-43-259-35-91 8-164 63-232-15-57-65-44-157 13-234Z" opacity=".85" />

      <g filter={`url(#${id}-shadow)`}>
        <path fill={`url(#${id}-bubble)`} stroke="#e0f7f4" strokeWidth="2" d="M478 77h185c39 0 70 31 70 70v75c0 39-31 70-70 70h-98l-58 48c-11 9-27 1-25-13l7-45c-31-12-52-42-52-76v-59c0-39 31-70 70-70Z" />
        <text x="505" y="163" fill="#0b2448" fontFamily="Arial, sans-serif" fontSize="40" fontWeight="800">
          {text.top}
        </text>
        <text x="505" y="217" fill="#0d9488" fontFamily="Arial, sans-serif" fontSize="40" fontWeight="800">
          {text.bottom}
        </text>
        <path d="M508 251h74" stroke="#10b9ad" strokeLinecap="round" strokeWidth="8" />
      </g>
      <g fill="none" stroke="#10b9ad" strokeLinecap="round" strokeWidth="11">
        <path d="M675 60c29 18 47 48 47 84" />
        <path d="M650 91c18 12 29 31 29 54" />
      </g>

      <g opacity=".32">
        {Array.from({ length: 20 }).map((_, index) => {
          const col = index % 5;
          const row = Math.floor(index / 5);
          return <circle key={index} cx={500 + col * 22} cy={350 + row * 22} r="4" fill="#7ddbd3" />;
        })}
      </g>

      <g filter={`url(#${id}-shadow)`}>
        <path fill={`url(#${id}-shirt)`} d="M116 520c8-118 65-199 154-199h13c91 0 149 81 158 199H116Z" />
        <path fill="#16b8aa" d="M184 331h184l-91 75-93-75Z" />
        <path fill="#061a34" d="M208 334c13 44 37 79 70 103 32-24 56-59 69-103H208Z" />
        <path d="M179 381h194" stroke="#11b9ad" strokeLinecap="round" strokeWidth="9" />
        <circle cx="392" cy="392" r="31" fill="#0d9488" />
        <path d="M374 393c0-17 13-31 30-31 8 0 16 3 21 9M424 405c-8 8-19 13-31 13h-11l-18 12 6-20" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
        <path d="M392 386v-23M406 392v-24M419 397v-20" stroke="#ffffff" strokeLinecap="round" strokeWidth="5" />
      </g>

      <g filter={`url(#${id}-shadow)`}>
        <path fill={`url(#${id}-hair)`} d="M113 229c-18-89 42-185 143-199 84-12 153 38 170 120 16 78-28 150-91 179-30 14-76 9-105-2-75-29-107-30-117-98Z" />
        <path fill="#223f70" d="M120 183c29-82 92-133 184-142 47-5 92 14 118 48-52-4-99 11-142 44-50 38-98 55-160 50Z" opacity=".88" />
        <path fill={`url(#${id}-skin)`} stroke="#8b4a2b" strokeOpacity=".12" strokeWidth="2" d="M156 178c0-66 51-121 119-121s121 55 121 121v45c0 68-53 123-121 123s-119-55-119-123v-45Z" />
        <path fill={`url(#${id}-hair)`} d="M142 160c21-75 79-123 168-139 51 24 89 64 105 127-67-35-126-28-179 12-26 20-55 24-94 0Z" />
        <path d="M196 178c19-12 42-12 60 0M292 178c20-12 43-12 61 0" stroke="#06152b" strokeLinecap="round" strokeWidth="7" />
        <circle cx="222" cy="206" r="16" fill="#071f3d" />
        <circle cx="322" cy="206" r="16" fill="#071f3d" />
        <circle cx="228" cy="199" r="5" fill="#ffffff" />
        <circle cx="328" cy="199" r="5" fill="#ffffff" />
        <path d="M245 262c22 22 56 22 78 0" fill="none" stroke="#7c2d12" strokeLinecap="round" strokeWidth="8" />
        <path d="M257 276c16 8 38 8 54 0" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" />
        <circle cx="146" cy="217" r="18" fill="#e9945f" />
        <circle cx="404" cy="217" r="18" fill="#e9945f" />
        <circle cx="135" cy="229" r="8" fill="#0d9488" />
        <circle cx="417" cy="229" r="8" fill="#0d9488" />
      </g>

      <g filter={`url(#${id}-shadow)`}>
        <path fill={`url(#${id}-hand)`} d="M55 360c-32-25-51-65-51-108v-65c0-18 14-32 32-32s32 14 32 32v78-116c0-18 14-32 32-32s32 14 32 32v115-98c0-18 14-32 32-32s32 14 32 32v111-63c0-18 14-32 32-32s32 14 32 32v69c0 89-67 161-151 161-35 0-67-12-94-34Z" />
        <path d="M68 266v-116M133 265V132M197 280V169M256 299v-82" stroke="#c86f3d" strokeLinecap="round" strokeWidth="5" opacity=".44" />
        <path fill={`url(#${id}-hand)`} d="M288 405c30-16 63-39 99-68 15-12 38-10 51 6 13 16 10 40-7 53l-78 61c-38 30-89 37-133 18l-62-26c-19-8-28-31-19-50 8-20 31-29 50-20l61 26c13 6 26 6 38 0Z" />
        <path d="M225 438c61 27 122-10 187-65" stroke="#c86f3d" strokeLinecap="round" strokeWidth="5" opacity=".42" />
      </g>
    </svg>
  );
}
