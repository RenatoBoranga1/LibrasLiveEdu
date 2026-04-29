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
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex min-h-12 items-center gap-2 rounded-lg px-4 py-3 text-sm font-black ${
        connected ? "bg-ocean text-white" : "bg-amber/20 text-ink dark:text-white"
      }`}
    >
      {connected ? <Wifi className="h-5 w-5" aria-hidden="true" /> : <WifiOff className="h-5 w-5" aria-hidden="true" />}
      <span>{error ?? label ?? defaultLabel}</span>
    </div>
  );
}
