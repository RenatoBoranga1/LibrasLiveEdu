import type { SVGProps } from "react";

export type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "role"> & {
  title?: string;
  decorative?: boolean;
};
