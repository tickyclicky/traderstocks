// Trading Trainer service worker: cache the app shell so it opens with no signal.
const CACHE = "tt-shell-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const isPage = e.request.mode === "navigate" || /\/(index\.html)?$/.test(new URL(e.request.url).pathname);
  if (isPage) {
    // Pages: network first so updates apply at once; cache if offline or slow (>2.5s).
    e.respondWith(
      new Promise((resolve) => {
        const timer = setTimeout(() => caches.match(e.request, { ignoreSearch: true }).then((h) => h && resolve(h)), 2500);
        fetch(e.request).then((r) => {
          clearTimeout(timer);
          if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
          resolve(r);
        }).catch(() => {
          clearTimeout(timer);
          caches.match(e.request, { ignoreSearch: true }).then((h) => resolve(h || Response.error()));
        });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }))
  );
});
