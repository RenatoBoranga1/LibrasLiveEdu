const CACHE_NAME = "libraslive-edu-public-v3";
const CORE_ASSETS = [
  "/",
  "/aluno",
  "/offline.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.svg",
  "/icon-512.svg",
  "/icon-maskable.svg",
];

const PRIVATE_PATTERNS = [
  "/api/auth",
  "/api/admin",
  "/api/classes",
  "/api/consent",
  "/api/me",
  "/join/",
  "/teacher",
  "/admin",
  "token=",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_CACHE") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isPrivate = PRIVATE_PATTERNS.some((pattern) => event.request.url.includes(pattern) || url.pathname.includes(pattern));
  if (isPrivate || event.request.headers.has("authorization")) {
    event.respondWith(fetch(event.request));
    return;
  }
  const isApprovedGlossary = url.pathname.endsWith("/api/signs") && url.searchParams.get("status") === "approved";
  if (isApprovedGlossary) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icon"))) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match("/offline.html"));
    })
  );
});
