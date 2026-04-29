"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Camera } from "lucide-react";

type BarcodeDetectorLike = new (options: { formats: string[] }) => {
  detect: (source: ImageBitmap) => Promise<Array<{ rawValue: string }>>;
};

export function QRCodeScanner({
  onManualFocus,
  onDetected,
}: {
  onManualFocus?: () => void;
  onDetected?: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function scanImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const browserWindow = window as typeof window & { BarcodeDetector?: BarcodeDetectorLike };
    if (!browserWindow.BarcodeDetector) {
      setMessage("Leitor automático indisponível neste navegador. Digite o código mostrado pelo professor.");
      onManualFocus?.();
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new browserWindow.BarcodeDetector({ formats: ["qr_code"] });
      const codes = await detector.detect(bitmap);
      const rawValue = codes[0]?.rawValue;
      if (rawValue) {
        onDetected?.(rawValue);
      setMessage("QR Code lido com sucesso.");
      } else {
      setMessage("Não encontrei um QR Code nessa imagem.");
      }
    } catch {
      setMessage("Não foi possível ler o QR Code. Digite o código manualmente.");
      onManualFocus?.();
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <input ref={inputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={scanImage} />
      <button
        type="button"
        className="focus-ring flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border border-ocean/20 bg-white px-4 py-3 text-base font-black text-ocean shadow-soft dark:border-mint/20 dark:bg-zinc-900 dark:text-mint"
        onClick={() => inputRef.current?.click()}
        aria-label="Escanear QR Code"
      >
        <Camera className="h-5 w-5" aria-hidden="true" />
        Escanear QR Code
      </button>
      {message && <p role="status" className="text-sm font-semibold text-ink/70 dark:text-white/70">{message}</p>}
    </div>
  );
}
