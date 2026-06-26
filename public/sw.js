self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))),
      self.registration.unregister(),
      self.clients.claim(),
    ]).then(() => self.clients.matchAll({ type: "window" })).then((clients) => {
      for (const client of clients) client.navigate(client.url);
    }),
  );
});