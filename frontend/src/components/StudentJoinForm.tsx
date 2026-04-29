"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { AccessibleModeToggle } from "@/components/AccessibleModeToggle";
import { ChildModeToggle } from "@/components/ChildModeToggle";
import { QRCodeScanner } from "@/components/QRCodeScanner";

export function StudentJoinForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [code, setCode] = useState("");
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(true);
  const [mode, setMode] = useState<"child" | "adult">("child");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!/^AULA-[A-Z0-9]{4}-[A-Z0-9]{4}$|^AULA-[0-9]{4}$/.test(normalized)) {
      setError("Digite o codigo da aula no formato AULA-8F4K-29QX.");
      return;
    }
    router.push(`/join/${encodeURIComponent(normalized)}`);
  }

  function handleQrDetected(value: string) {
    if (value.startsWith("/join/")) {
      router.push(value);
      return;
    }
    try {
      const url = new URL(value);
      if (url.pathname.startsWith("/join/")) {
        router.push(`${url.pathname}${url.search}`);
        return;
      }
    } catch {
      // The QR Code may contain only the class code.
    }
    const normalized = value.trim().toUpperCase();
    setCode(normalized);
    if (/^AULA-[A-Z0-9]{4}-[A-Z0-9]{4}$|^AULA-[0-9]{4}$/.test(normalized)) {
      router.push(`/join/${encodeURIComponent(normalized)}`);
    }
  }

  return (
    <section className={`mx-auto grid max-w-xl gap-4 ${highContrast ? "high-contrast" : ""}`}>
      <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-zinc-900">
        <h1 className={`${largeText ? "text-4xl" : "text-3xl"} font-black text-ink dark:text-white`}>
          Entrar na aula
        </h1>
        <p className="mt-3 text-base font-semibold leading-relaxed text-ink/75 dark:text-white/75">
          {mode === "child" ? "Digite o codigo que o professor mostrou." : "Informe o codigo curto da sala ou use o QR Code fornecido pelo professor."}
        </p>
        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">
            {error}
          </div>
        )}
        <form className="mt-5 grid gap-3" onSubmit={submit}>
          <label className="block text-sm font-bold text-ink/75 dark:text-white/75" htmlFor="class-code">
            Codigo da aula
            <input
              ref={inputRef}
              id="class-code"
              className="focus-ring mt-2 min-h-16 w-full rounded-lg border-2 border-ocean/30 bg-white px-4 text-center text-2xl font-black uppercase tracking-normal text-ink dark:border-mint/30 dark:bg-zinc-950 dark:text-white"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="AULA-8F4K-29QX"
              autoCapitalize="characters"
              inputMode="text"
              aria-describedby="code-example"
            />
          </label>
          <p id="code-example" className="text-sm font-semibold text-ink/65 dark:text-white/65">
            Exemplo: AULA-8F4K-29QX
          </p>
          <button className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-ocean px-4 py-3 text-lg font-black text-white">
            <Play className="h-5 w-5" aria-hidden="true" />
            Entrar na aula
          </button>
        </form>
      </div>
      <QRCodeScanner onManualFocus={() => inputRef.current?.focus()} onDetected={handleQrDetected} />
      <AccessibleModeToggle
        highContrast={highContrast}
        largeText={largeText}
        onHighContrast={() => setHighContrast((value) => !value)}
        onLargeText={() => setLargeText((value) => !value)}
      />
      <ChildModeToggle value={mode} onChange={setMode} />
    </section>
  );
}
