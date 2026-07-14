const CACHE_NAME = "body-log-v1-20260714-history-calendar-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260714-history-calendar-v1",
  "./core.js?v=20260714-history-calendar-v1",
  "./app.js?v=20260714-history-calendar-v1",
  "./icon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
