import { useId, type SVGProps } from "react";

type LibrasLiveIconProps = Omit<SVGProps<SVGSVGElement>, "role"> & {
  size?: number;
  title?: string;
  decorative?: boolean;
};

export function LibrasLiveIcon({
  size = 48,
  title = "Símbolo do LibrasLive Edu",
  decorative = false,
  className,
  ...props
}: LibrasLiveIconProps) {
  const titleId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : titleId}
      {...props}
    >
      {!decorative && <title id={titleId}>{title}</title>}
      <rect width="64" height="64" rx="16" fill="#12304A" />
      <path
        d="M13.5 28.5C13.5 18.8 21.4 11 31 11c3.8 0 7.3 1.2 10.2 3.2"
        fill="none"
        stroke="#59D4C2"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M45.9 25.2c2.2 7.2-.3 15.2-6.5 19.6-5.1 3.7-11.8 4.4-17.5 2.1l-8.4 4.8 2.2-9.3a18.1 18.1 0 0 1-2.1-6.2"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4.5"
      />
      <path
        d="M24.2 33.3V23a2.8 2.8 0 0 1 5.6 0v7.7-10.1a2.8 2.8 0 0 1 5.6 0v10.5-7.7a2.8 2.8 0 0 1 5.6 0v10.2c0 7.1-5.7 12.8-12.8 12.8h-1.1a9.8 9.8 0 0 1-9.8-9.8v-3.3a2.9 2.9 0 0 1 5.1-1.8l1.8 1.8Z"
        fill="#FFFFFF"
      />
      <path d="M47.4 12.4c3.2 2 5.3 5.4 5.5 9.2M44.3 17c1.5 1 2.4 2.6 2.5 4.4" fill="none" stroke="#F3B84B" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
