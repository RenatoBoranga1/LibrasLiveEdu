import type { HTMLAttributes, ReactNode } from "react";
import { AlertTriangle, Ban, Inbox, LoaderCircle, LockKeyhole, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-ink/8 dark:bg-white/10", className)} {...props} />; }

function StatePanel({ icon: Icon, title, description, action, role = "status" }: { icon: typeof Inbox; title: string; description: string; action?: ReactNode; role?: "status" | "alert" }) {
  return <div role={role} className="grid min-h-52 place-items-center rounded-lg border border-dashed border-ink/15 bg-white p-6 text-center dark:border-white/15 dark:bg-zinc-900"><div className="max-w-md"><Icon className="mx-auto h-9 w-9 text-ocean dark:text-mint" aria-hidden="true" /><h2 className="mt-3 text-xl font-extrabold text-ink dark:text-white">{title}</h2><p className="mt-2 text-sm font-medium leading-relaxed text-ink/65 dark:text-white/65">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div></div>;
}

export function EmptyState({ title = "Nada por aqui", description, action }: { title?: string; description: string; action?: ReactNode }) { return <StatePanel icon={Inbox} title={title} description={description} action={action} />; }
export function LoadingState({ label = "Carregando conteúdo..." }: { label?: string }) { return <div role="status" className="flex min-h-40 items-center justify-center gap-3 rounded-lg border border-ink/10 bg-white p-6 font-bold text-ink/65 dark:border-white/10 dark:bg-zinc-900 dark:text-white/65"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />{label}</div>; }
export function ErrorState({ title = "Não foi possível carregar", description, onRetry }: { title?: string; description: string; onRetry?: () => void }) { return <StatePanel role="alert" icon={AlertTriangle} title={title} description={description} action={onRetry ? <Button variant="secondary" onClick={onRetry}><RefreshCcw className="h-4 w-4" aria-hidden="true" />Tentar novamente</Button> : undefined} />; }
export function PermissionState({ forbidden = false }: { forbidden?: boolean }) { return <StatePanel role="alert" icon={forbidden ? Ban : LockKeyhole} title={forbidden ? "Acesso não permitido" : "Autenticação necessária"} description={forbidden ? "Seu perfil não tem permissão para acessar esta área." : "Entre com uma conta autorizada para continuar."} />; }
export function OfflineState({ onRetry }: { onRetry?: () => void }) { return <StatePanel role="alert" icon={WifiOff} title="Você está offline" description="Verifique sua conexão. Suas preferências locais continuam disponíveis." action={onRetry ? <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button> : undefined} />; }

export function StatusBanner({ status, title, children }: { status: "info" | "success" | "warning" | "error"; title: string; children?: ReactNode }) {
  const tones = { info: "bg-sky/60 border-ocean/20", success: "bg-mint border-ocean/20", warning: "bg-amber/45 border-amber-strong/25", error: "bg-red-100 border-red-300 text-red-950" };
  return <div role={status === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm font-semibold", tones[status])}><strong className="block font-extrabold">{title}</strong>{children ? <div className="mt-1">{children}</div> : null}</div>;
}
