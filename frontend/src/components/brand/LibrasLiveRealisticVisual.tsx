import Image from "next/image";

export type RealisticVisualVariant = "classroom" | "teacher" | "student" | "curation";

const visualConfig: Record<RealisticVisualVariant, { src: string; alt: string }> = {
  classroom: {
    src: "/brand/libraslive-classroom-realistic.jpg",
    alt: "Sala de aula inclusiva acompanhando legenda e apoio visual em Libras",
  },
  teacher: {
    src: "/brand/libraslive-teacher-realistic.jpg",
    alt: "Professora preparando uma aula inclusiva com recursos digitais",
  },
  student: {
    src: "/brand/libraslive-student-realistic.jpg",
    alt: "Estudante acompanhando uma aula acessível em um tablet",
  },
  curation: {
    src: "/brand/libraslive-curation-realistic.jpg",
    alt: "Especialista revisando mídias de Libras para curadoria",
  },
};

export function LibrasLiveRealisticVisual({
  variant,
  className = "h-full w-full",
  imageClassName = "object-cover object-center",
  priority = false,
  decorative = false,
}: {
  variant: RealisticVisualVariant;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  const visual = visualConfig[variant];

  return (
    <figure className={`relative overflow-hidden ${className}`} aria-hidden={decorative || undefined}>
      <Image
        src={visual.src}
        alt={decorative ? "" : visual.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
        className={imageClassName}
      />
    </figure>
  );
}
