const C = "nsq-v5"; // E ndryshova në v5 për të detyruar pastrimin e cache-it të vjetër
const A = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "manifest.webmanifest",
  "assets/logo/icon-192.png",
  "assets/logo/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(C).then(c => c.addAll(A)).then(() => self.skipWaiting())
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
  
  if (u.origin == location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(
      caches.match(r).then(h => {
        const n = fetch(r).then(x => {
          if (x.ok) { 
            const y = x.clone(); 
            caches.open(C).then(c => c.put(r, y)); 
          }
          return x;
        }).catch(() => h);
        return h || n;
      })
    );
  }
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(l =>
      l.length ? l[0].focus() : clients.openWindow("./")
    )
  );
});