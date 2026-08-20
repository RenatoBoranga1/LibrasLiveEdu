import Image from "next/image";

type WelcomeVisualVariant = "hero" | "fallback" | "compact";

export function LibrasLiveWelcomeVisual({
  className = "",
  variant = "hero",
  priority = false,
  decorative = false,
}: {
  className?: string;
  variant?: WelcomeVisualVariant;
  priority?: boolean;
  decorative?: boolean;
}) {
  const variantClass = {
    hero: "aspect-[4/5] min-h-[420px]",
    fallback: "aspect-[4/5] w-36 sm:w-44",
    compact: "aspect-square w-12",
  }[variant];

  return (
    <figure
      className={`relative overflow-hidden rounded-lg border border-white/15 bg-sky shadow-elevated ${variantClass} ${className}`}
      aria-hidden={decorative || undefined}
    >
      <Image
        src="/brand/libraslive-welcome-realistic.png"
        alt={decorative ? "" : "Representante visual do LibrasLive Edu dando boas-vindas"}
        fill
        priority={priority}
        sizes={variant === "hero" ? "(min-width: 1024px) 420px, 70vw" : variant === "fallback" ? "176px" : "48px"}
        className="object-cover object-top"
      />
    </figure>
  );
}
