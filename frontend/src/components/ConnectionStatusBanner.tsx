import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatusBanner({
  connected,
  reconnecting,
  error,
  label,
}: {
  connected: boolean;
  reconnecting?: boolean;
  error?: string | null;
  label?: string;
}) {
  const defaultLabel = connected ? "Conectado" : reconnecting ? "Tentando reconectar" : "Aguardando professor";
  const description = connected
    ? "A legenda e os sinais aprovados serão atualizados automaticamente."
    : reconnecting
      ? "Aguarde um instante. A conexão será retomada sem perder suas preferências."
      : "A aula aparecerá assim que o professor iniciar a transmissão.";
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex min-h-14 items-center gap-3 rounded-lg border px-4 py-3 ${
        connected ? "border-ocean/20 bg-mint text-ink" : "border-amber-strong/25 bg-amber/30 text-ink dark:text-white"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${connected ? "bg-ocean text-white" : "bg-white text-amber-strong dark:bg-zinc-900"}`}>
        {connected ? <Wifi className="h-5 w-5" aria-hidden="true" /> : <WifiOff className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <strong className="block text-sm font-black">{error ?? label ?? defaultLabel}</strong>
        <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-ink/65 dark:text-white/70">{error ? "Verifique sua internet ou aguarde a reconexão automática." : description}</span>
      </span>
    </div>
  );
}
