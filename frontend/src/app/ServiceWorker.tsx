"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "libraslive.chunk_reload_at";
const CACHE_PREFIX = "libraslive-edu-";

function isChunkLoadFailure(value: unknown) {
  const message = value instanceof Error ? value.message : String(value ?? "");
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module/i.test(message);
}

export function ServiceWorker() {
  useEffect(() => {
    function recoverFromChunkFailure(value: unknown) {
      if (!isChunkLoadFailure(value)) return;
      const previousReload = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
      if (Date.now() - previousReload < 10_000) return;
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }

    const handleWindowError = (event: ErrorEvent) => recoverFromChunkFailure(event.error ?? event.message);
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => recoverFromChunkFailure(event.reason);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("error", handleWindowError);
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      };
    }

    if (process.env.NODE_ENV !== "production") {
      Promise.all([
        navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        ),
        "caches" in window
          ? window.caches.keys().then((keys) =>
              Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => window.caches.delete(key)))
            )
          : Promise.resolve([]),
      ]).catch(() => undefined);
    } else {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
