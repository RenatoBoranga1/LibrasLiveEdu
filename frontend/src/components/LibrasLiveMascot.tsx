"use client";

import { useId, type SVGProps } from "react";

type MascotVariant = "default" | "compact" | "avatar" | "empty";

type LibrasLiveMascotProps = Omit<SVGProps<SVGSVGElement>, "role"> & {
  size?: number;
  variant?: MascotVariant;
  ariaLabel?: string;
  decorative?: boolean;
};

export function LibrasLiveMascot({
  size = 220,
  className,
  variant = "default",
  ariaLabel = "Mascote Liva do LibrasLive Edu sinalizando em Libras",
  decorative = false,
  ...props
}: LibrasLiveMascotProps) {
  const compact = variant === "compact";
  const empty = variant === "empty";
  const avatar = variant === "avatar";
  const uniqueId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const labelId = decorative ? undefined : `${uniqueId}-title`;
  const descId = decorative ? undefined : `${uniqueId}-desc`;
  const bubbleId = `${uniqueId}-bubble`;
  const mintId = `${uniqueId}-mint`;
  const amberId = `${uniqueId}-amber`;

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
            Personagem vetorial original com rosto amigavel, maos em destaque, balao de fala e ondas de comunicacao ao vivo.
          </desc>
        </>
      )}
      <defs>
        <linearGradient id={bubbleId} x1="54" x2="310" y1="42" y2="309" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0f766e" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id={mintId} x1="104" x2="258" y1="90" y2="270" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ecfdf5" />
          <stop offset="1" stopColor="#99f6e4" />
        </linearGradient>
        <linearGradient id={amberId} x1="90" x2="278" y1="42" y2="315" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <path
        fill={empty ? "#fef3c7" : `url(#${bubbleId})`}
        d="M62 84c0-28 22-50 50-50h138c28 0 50 22 50 50v120c0 28-22 50-50 50h-44l-68 58c-13 11-33 2-33-15v-43h7c-28 0-50-22-50-50V84Z"
      />
      <path
        fill="none"
        stroke={empty ? "#92400e" : "#fbbf24"}
        strokeLinecap="round"
        strokeWidth={compact ? 12 : 14}
        d="M282 80c21 13 34 34 34 59M304 50c34 21 54 54 54 92"
      />
      {!compact && (
        <path
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeOpacity=".9"
          strokeWidth="10"
          d="M87 218h62M87 242h42"
        />
      )}

      <g transform={avatar ? "translate(0 4)" : undefined}>
        <path
          fill="#0f172a"
          opacity=".16"
          d="M102 295c0-25 36-45 80-45s80 20 80 45c0 11-36 20-80 20s-80-9-80-20Z"
        />
        <path
          fill={`url(#${mintId})`}
          stroke="#064e3b"
          strokeLinejoin="round"
          strokeWidth="9"
          d="M116 231c0-42 29-75 66-75s66 33 66 75v37c0 18-15 33-33 33h-66c-18 0-33-15-33-33v-37Z"
        />
        <circle cx="182" cy="126" r="47" fill="#ecfdf5" stroke="#064e3b" strokeWidth="9" />
        <path
          fill="#0f766e"
          d="M137 122c3-31 22-53 50-53 31 0 49 22 51 54-19 1-38-5-54-18-11 11-27 17-47 17Z"
        />
        <circle cx="164" cy="130" r="5" fill="#064e3b" />
        <circle cx="202" cy="130" r="5" fill="#064e3b" />
        <path fill="none" stroke="#064e3b" strokeLinecap="round" strokeWidth="6" d="M168 150c9 8 20 8 29 0" />
        <path fill="none" stroke="#f59e0b" strokeLinecap="round" strokeWidth="9" d="M146 197h73" />
      </g>

      <g>
        <path
          fill="#ecfdf5"
          stroke="#064e3b"
          strokeLinejoin="round"
          strokeWidth="8"
          d="M82 222v-55c0-14 11-25 25-25s25 11 25 25v35l10-20c6-12 21-17 33-11s17 21 11 33l-25 52c-9 18-27 30-47 30h-8c-21 0-38-17-38-38v-20c0-12 10-22 22-22 4 0 8 1 12 3Z"
        />
        <path fill="none" stroke="#064e3b" strokeLinecap="round" strokeWidth="9" d="M105 206v-54M130 201v-42M155 181l9-18" />
        <path
          fill="#ecfdf5"
          stroke="#064e3b"
          strokeLinejoin="round"
          strokeWidth="8"
          d="M278 221v-48c0-13-11-24-24-24s-24 11-24 24v32l-11-18c-7-11-22-15-33-8s-15 22-8 33l29 47c10 16 28 26 47 26h4c23 0 42-19 42-42v-14c0-13-10-23-23-23-4 0-8 1-12 3Z"
        />
        <path fill="none" stroke="#064e3b" strokeLinecap="round" strokeWidth="9" d="M255 205v-50M231 202v-37M204 183l-10-16" />
      </g>

      <g>
        <circle cx="86" cy="70" r="15" fill={`url(#${amberId})`} />
        <path fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="8" d="M78 70h16" />
        <path fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="8" d="M86 62v16" />
      </g>
    </svg>
  );
}
