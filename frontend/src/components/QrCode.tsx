"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ code, value }: { code: string; value?: string }) {
  const [dataUrl, setDataUrl] = useState("");
  const qrValue = value ?? code;

  useEffect(() => {
    QRCode.toDataURL(qrValue, {
      margin: 1,
      width: 240,
      color: {
        dark: "#10201c",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    }).then(setDataUrl).catch(() => setDataUrl(""));
  }, [qrValue]);

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-soft dark:border-white/10 dark:bg-zinc-900">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR Code para entrar na aula ${code}`} className="h-44 w-44 rounded-md" />
      ) : (
        <div className="grid h-44 w-44 place-items-center rounded-md bg-teal-50 text-center text-sm font-bold text-ink">
          Gerando QR Code
        </div>
      )}
      <p className="mt-3 text-center text-sm font-black tracking-normal text-ink dark:text-white">{code}</p>
    </div>
  );
}
