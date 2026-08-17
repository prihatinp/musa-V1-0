// =========================================================
// MUSA App 2.0 — Service Worker
// Offline-first caching for the app shell (static assets).
// Cross-origin API calls (Google Apps Script) are left to the
// network / gas-api.js's own localStorage cache layer.
// =========================================================

const CACHE_NAME = "musa-app-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/main.css",
  "./assets/css/components.css",
  "./assets/css/responsive.css",
  "./assets/js/app.js",
  "./assets/js/gas-api.js",
  "./assets/js/ai-assistant.js",
  "./assets/js/ui-renderers.js",
  "./icons/icon.svg",
];

// Google Fonts hosts are cached opportunistically (stale-while-revalidate)
// so icons/type keep working offline after the first successful load.
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) {
    if (FONT_HOSTS.includes(url.hostname)) {
      event.respondWith(
        caches.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((res) => {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
              return res;
            })
            .catch(() => cached);
          return cached || networkFetch;
        })
      );
    }
    return; // let GAS / other cross-origin requests hit the network directly
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
