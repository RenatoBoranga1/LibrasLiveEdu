"use client";

import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LoadingState } from "@/components/ui/AsyncStates";
import { useRequireRole } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/cn";

type ShellProps = { children: ReactNode; className?: string };

function Surface({ children, className, header = true }: ShellProps & { header?: boolean }) {
  return <main className={cn("min-h-screen bg-paper text-ink dark:bg-zinc-950 dark:text-white", className)}>{header ? <AppHeader /> : null}{children}</main>;
}

function ProtectedSurface({ roles, children, className }: ShellProps & { roles: string[] }) {
  const auth = useRequireRole(roles);
  return <Surface className={className}>{auth.loading ? <div className="mx-auto max-w-7xl px-4 py-8"><LoadingState label="Verificando acesso..." /></div> : children}</Surface>;
}

export function PublicShell(props: ShellProps) { return <Surface {...props} />; }
export function StudentShell(props: ShellProps) { return <ProtectedSurface roles={["student"]} {...props} />; }
export function TeacherShell(props: ShellProps) { return <ProtectedSurface roles={["professor", "admin"]} {...props} />; }
export function AdminShell(props: ShellProps) { return <ProtectedSurface roles={["admin"]} {...props} />; }
export function CuratorShell(props: ShellProps) { return <ProtectedSurface roles={["admin", "curator"]} {...props} />; }
export function ClassroomShell({ children, className }: ShellProps) { return <Surface header={false} className={cn("student-classroom w-full max-w-full overflow-x-clip", className)}>{children}</Surface>; }
