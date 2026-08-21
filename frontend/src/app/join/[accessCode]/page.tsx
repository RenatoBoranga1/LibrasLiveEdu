"use client";

import { useParams } from "next/navigation";
import { StudentClassroomPage } from "@/features/student/components/StudentClassroomPage";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function JoinClassPage() {
  const params = useParams<{ accessCode: string }>();
  const accessCode = decodeURIComponent(params.accessCode ?? (demoMode ? "AULA-4821" : "")).toUpperCase();
  return <StudentClassroomPage accessCode={accessCode} />;
}
