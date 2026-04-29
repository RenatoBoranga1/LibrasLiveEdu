import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatusBanner({
  connected,
  reconnecting,
  error,
}: {
  connected: boolean;
  reconnecting?: boolean;
  error?: string | null;
}) {
  const label = connected ? "Conectado ao vivo" : reconnecting ? "Reconectando" : "Sem conexao ao vivo";
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex min-h-12 items-center gap-2 rounded-lg px-4 py-3 text-sm font-black ${
        connected ? "bg-ocean text-white" : "bg-amber/20 text-ink dark:text-white"
      }`}
    >
      {connected ? <Wifi className="h-5 w-5" aria-hidden="true" /> : <WifiOff className="h-5 w-5" aria-hidden="true" />}
      <span>{error ?? label}</span>
    </div>
  );
}
