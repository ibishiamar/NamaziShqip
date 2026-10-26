const C = "nsq-v6";
const A = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "manifest.webmanifest",
  "ezani.mp3",
  "assets/logo/icon-192.png",
  "assets/logo/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(C)
      .then(c => Promise.all(A.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x != C).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method != "GET") return;
  const u = new URL(r.url);

  // API-të e jashtme (Aladhan, geokodim etj.) nuk ruhen në cache
  const isFont = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin != location.origin && !isFont) return;

  // Audio (ezani.mp3) përdor kërkesa me Range, ato lihen direkt te rrjeti/cache
  if (r.headers.has("range")) {
    e.respondWith(
      caches.match(u.href).then(h => h || fetch(r))
    );
    return;
  }

  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(h => {
      const n = fetch(r).then(x => {
        if (x && x.ok && x.status === 200) {
          const y = x.clone();
          caches.open(C).then(c => c.put(r, y)).catch(() => {});
        }
        return x;
      }).catch(() => {
        if (h) return h;
        if (r.mode === "navigate") return caches.match("index.html").then(i => i || caches.match("./"));
        return new Response("", { status: 503, statusText: "Offline" });
      });
      return h || n;
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(l =>
      l.length ? l[0].focus() : clients.openWindow("./")
    )
  );
});