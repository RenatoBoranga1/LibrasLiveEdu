import { StudentAccessibilityBar } from "@/components/StudentAccessibilityBar";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof StudentAccessibilityBar>;

export function StudentAccessibilityToolbar(props: Props) {
  return <StudentAccessibilityBar {...props} />;
}
