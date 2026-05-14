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

const poseLabels: Record<Exclude<MascotVariant, "compact">, string> = {
  hero: "Seja bem-vindo",
  welcome: "Seja bem-vindo",
  learning: "Aprendizado",
  communication: "Comunicacao",
  inclusion: "Inclusao",
  live: "Ao vivo",
  empty: "Aguardando sinal",
  avatar: "Avatar Libras",
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
  const compact = variant === "compact";
  const fullVariant: Exclude<MascotVariant, "compact"> = variant === "compact" ? "hero" : variant;
  const empty = fullVariant === "empty";
  const pose = fullVariant === "hero" || fullVariant === "avatar" ? "welcome" : fullVariant;
  const label = poseLabels[fullVariant];

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
            <desc id={descId}>Icone original com mao, balao de fala e ondas de comunicacao ao vivo.</desc>
          </>
        )}
        <defs>
          <linearGradient id={`${id}-icon-bg`} x1="82" x2="430" y1="70" y2="448" gradientUnits="userSpaceOnUse">
            <stop stopColor="#183a68" />
            <stop offset=".58" stopColor="#0b2a52" />
            <stop offset="1" stopColor="#061a35" />
          </linearGradient>
          <linearGradient id={`${id}-icon-teal`} x1="104" x2="398" y1="104" y2="366" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7cf8e9" />
            <stop offset="1" stopColor="#13b8aa" />
          </linearGradient>
          <filter id={`${id}-icon-shadow`} x="-15%" y="-15%" width="130%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#020817" floodOpacity=".24" />
          </filter>
        </defs>
        <rect x="52" y="52" width="408" height="408" rx="96" fill={`url(#${id}-icon-bg)`} />
        <g filter={`url(#${id}-icon-shadow)`}>
          <path
            d="M143 255c0-73 59-132 132-132 26 0 51 8 72 22"
            fill="none"
            stroke={`url(#${id}-icon-teal)`}
            strokeLinecap="round"
            strokeWidth="28"
          />
          <path
            d="M372 247c23 37 18 85-12 119-31 36-82 50-129 36h-39l-62 44 17-65c-29-31-44-73-38-116"
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="28"
          />
          <path
            fill="#ffffff"
            stroke="#e5edf7"
            strokeWidth="4"
            d="M174 257v-78c0-15 12-27 27-27s27 12 27 27v57-76c0-15 12-27 27-27s27 12 27 27v78-61c0-15 12-27 27-27s27 12 27 27v92c0 58-47 105-105 105h-14c-44 0-80-36-80-80v-27c0-15 12-27 27-27 5 0 9 1 13 3Z"
          />
          <path d="M202 255v-95M255 237v-91M309 244v-77" stroke="#cbd5e1" strokeLinecap="round" strokeWidth="7" />
          <path
            d="M360 123c28 19 44 49 44 84M323 148c17 12 27 31 27 53"
            fill="none"
            stroke={`url(#${id}-icon-teal)`}
            strokeLinecap="round"
            strokeWidth="19"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 520 420"
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
            Mascote 3D estilizado original, com uniforme azul, maos em destaque e elementos de comunicacao acessivel.
          </desc>
        </>
      )}
      <defs>
        <radialGradient id={`${id}-stage`} cx="50%" cy="35%" r="72%">
          <stop stopColor={empty ? "#fff7ed" : "#f8fffe"} />
          <stop offset=".62" stopColor={empty ? "#fef3c7" : "#d9fbf5"} />
          <stop offset="1" stopColor={empty ? "#fde68a" : "#b7f0e8"} />
        </radialGradient>
        <linearGradient id={`${id}-skin`} x1="192" x2="270" y1="96" y2="230" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd8aa" />
          <stop offset=".55" stopColor="#f6b17b" />
          <stop offset="1" stopColor="#df7f4b" />
        </linearGradient>
        <linearGradient id={`${id}-hair`} x1="150" x2="290" y1="48" y2="214" gradientUnits="userSpaceOnUse">
          <stop stopColor="#223b68" />
          <stop offset=".5" stopColor="#0d2446" />
          <stop offset="1" stopColor="#020817" />
        </linearGradient>
        <linearGradient id={`${id}-shirt`} x1="154" x2="326" y1="246" y2="410" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16457a" />
          <stop offset=".55" stopColor="#0b2d57" />
          <stop offset="1" stopColor="#06152b" />
        </linearGradient>
        <linearGradient id={`${id}-hand`} x1="74" x2="356" y1="136" y2="352" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffddb5" />
          <stop offset=".7" stopColor="#efa067" />
          <stop offset="1" stopColor="#d97745" />
        </linearGradient>
        <linearGradient id={`${id}-panel`} x1="304" x2="500" y1="66" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1fffd" />
        </linearGradient>
        <filter id={`${id}-soft-shadow`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#020817" floodOpacity=".18" />
        </filter>
        <filter id={`${id}-mini-shadow`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#020817" floodOpacity=".16" />
        </filter>
      </defs>

      <rect x="34" y="28" width="452" height="362" rx="64" fill={`url(#${id}-stage)`} />
      <circle cx="104" cy="96" r="4" fill="#0d9488" opacity=".22" />
      <circle cx="126" cy="126" r="3" fill="#0d9488" opacity=".22" />
      <circle cx="414" cy="290" r="4" fill="#0d9488" opacity=".18" />
      <circle cx="440" cy="290" r="4" fill="#0d9488" opacity=".18" />
      <circle cx="466" cy="290" r="4" fill="#0d9488" opacity=".18" />

      <g filter={`url(#${id}-soft-shadow)`}>
        <path
          fill={`url(#${id}-panel)`}
          stroke="#ccfbf1"
          strokeWidth="2"
          d="M306 74h111c29 0 52 23 52 52v63c0 29-23 52-52 52h-55l-44 36c-9 8-23 1-22-11l5-33c-20-8-34-28-34-50v-57c0-29 23-52 52-52Z"
        />
        <text x="330" y="146" fill="#123866" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="800">
          {label}
        </text>
        <path d="M333 176h78" stroke="#0d9488" strokeLinecap="round" strokeWidth="8" />
      </g>

      <g fill="none" stroke="#10bfae" strokeLinecap="round" strokeWidth="11">
        <path d="M438 68c24 16 38 42 38 74" />
        <path d="M410 96c15 11 23 27 23 47" />
      </g>

      <g filter={`url(#${id}-soft-shadow)`}>
        <ellipse cx="244" cy="376" rx="108" ry="22" fill="#020817" opacity=".12" />
        <path
          fill={`url(#${id}-shirt)`}
          d="M138 388c7-78 45-130 103-130h8c60 0 98 52 105 130H138Z"
        />
        <path fill="#16b8aa" d="M181 266h128l-63 52-65-52Z" />
        <path fill="#071f3d" d="M198 268c9 30 25 53 48 70 22-17 38-40 47-70h-95Z" />
        <path d="M177 306h132" stroke="#10bfae" strokeLinecap="round" strokeWidth="7" opacity=".9" />
        <circle cx="320" cy="316" r="24" fill="#0f766e" />
        <path
          d="M307 317c0-13 10-23 23-23 6 0 12 2 16 7M344 326c-6 6-14 10-23 10h-8l-13 9 4-14"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path d="M320 311v-17M331 315v-18M340 320v-16" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" />
      </g>

      <g filter={`url(#${id}-soft-shadow)`}>
        <path
          fill={`url(#${id}-hair)`}
          d="M143 182c-10-58 28-121 94-130 55-7 100 25 111 78 12 58-20 106-62 124-20 8-48 5-67-2-49-18-70-25-76-70Z"
        />
        <path
          fill="#223b68"
          d="M147 151c20-54 62-88 121-94 32-3 60 9 78 31-34-2-65 8-93 29-33 25-66 37-106 34Z"
          opacity=".82"
        />
        <path
          fill={`url(#${id}-skin)`}
          stroke="#8b4a2b"
          strokeOpacity=".14"
          strokeWidth="2"
          d="M164 154c0-45 34-82 78-82s79 37 79 82v31c0 45-35 82-79 82s-78-37-78-82v-31Z"
        />
        <path
          fill={`url(#${id}-hair)`}
          d="M155 142c13-47 50-78 108-91 34 16 58 42 70 82-43-22-82-18-116 9-17 14-37 17-62 0Z"
        />
        <path d="M190 153c13-8 28-8 40 0M254 153c13-8 28-8 40 0" stroke="#06152b" strokeLinecap="round" strokeWidth="6" />
        <circle cx="207" cy="174" r="9" fill="#071f3d" />
        <circle cx="275" cy="174" r="9" fill="#071f3d" />
        <circle cx="211" cy="170" r="3" fill="#ffffff" />
        <circle cx="279" cy="170" r="3" fill="#ffffff" />
        <path d="M224 212c13 12 34 12 48 0" fill="none" stroke="#7c2d12" strokeLinecap="round" strokeWidth="6" />
        <path d="M231 222c9 5 24 5 34 0" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="3" />
        <circle cx="158" cy="180" r="12" fill="#e9945f" />
        <circle cx="325" cy="180" r="12" fill="#e9945f" />
        <circle cx="151" cy="188" r="6" fill="#0d9488" />
        <circle cx="333" cy="188" r="6" fill="#0d9488" />
      </g>

      <g filter={`url(#${id}-soft-shadow)`}>
        {pose === "learning" ? (
          <>
            <path
              fill={`url(#${id}-hand)`}
              d="M104 285c-17-17-27-40-27-65v-40c0-12 9-21 21-21s21 9 21 21v44-72c0-12 9-21 21-21s21 9 21 21v73-36c0-12 9-21 21-21s21 9 21 21v47c0 55-41 99-93 99-20 0-39-7-56-19Z"
            />
            <path d="M118 220v-69M160 224v-82M201 236v-44" stroke="#c86f3d" strokeLinecap="round" strokeWidth="4" opacity=".45" />
            <path d="M120 125c28-26 58-37 91-32" fill="none" stroke="#f59e0b" strokeLinecap="round" strokeWidth="9" />
          </>
        ) : (
          <>
            <path
              fill={`url(#${id}-hand)`}
              d="M87 286c-21-17-34-43-34-72v-43c0-12 10-22 22-22s22 10 22 22v51-76c0-12 10-22 22-22s22 10 22 22v75-64c0-12 10-22 22-22s22 10 22 22v73-42c0-12 10-22 22-22s22 10 22 22v45c0 59-44 106-99 106-23 0-44-8-63-23Z"
            />
            <path d="M97 222v-74M140 221v-86M184 230v-72M224 244v-54" stroke="#c86f3d" strokeLinecap="round" strokeWidth="4" opacity=".45" />
          </>
        )}

        {pose === "inclusion" ? (
          <>
            <path
              fill={`url(#${id}-hand)`}
              d="M225 319c16-11 33-25 50-42 9-9 24-9 33 1s9 24-1 33l-35 34c-22 21-56 22-80 3l-27-22c-10-8-12-23-4-33 8-11 23-12 34-4l21 17c3 3 6 5 9 6Z"
            />
            <path d="M254 330c13-25 41-25 54-2 13-23 42-23 55 1" fill="none" stroke="#f59e0b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="9" />
          </>
        ) : (
          <>
            <path
              fill={`url(#${id}-hand)`}
              d="M262 322c19-11 40-26 63-45 10-8 25-7 33 3 9 11 7 26-4 35l-50 40c-25 20-59 25-89 12l-40-17c-13-6-19-21-13-34 6-13 21-19 34-13l39 17c9 4 18 4 27 2Z"
            />
            <path d="M218 344c40 18 80-6 122-41" stroke="#c86f3d" strokeLinecap="round" strokeWidth="4" opacity=".45" />
          </>
        )}
      </g>

      {pose === "communication" && (
        <g filter={`url(#${id}-mini-shadow)`}>
          <circle cx="391" cy="332" r="30" fill="#0f766e" />
          <path d="M375 331h33M375 345h21" stroke="#ffffff" strokeLinecap="round" strokeWidth="7" />
        </g>
      )}

      {pose === "live" && (
        <g filter={`url(#${id}-mini-shadow)`}>
          <circle cx="391" cy="332" r="30" fill="#0f766e" />
          <circle cx="382" cy="332" r="5" fill="#ffffff" />
          <path d="M396 320c8 6 12 14 12 24M409 308c14 10 22 24 22 42" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="6" />
        </g>
      )}

      {empty && (
        <g filter={`url(#${id}-mini-shadow)`}>
          <circle cx="84" cy="84" r="18" fill="#f59e0b" />
          <path d="M84 75v14" stroke="#ffffff" strokeLinecap="round" strokeWidth="6" />
          <circle cx="84" cy="98" r="3" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}
