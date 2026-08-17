// FlexWeek v6 service worker.
// Intentionally network-only: no Cache Storage, no offline asset caching.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  if (event.request.method === "GET") {
    event.respondWith(fetch(event.request));
  }
});
