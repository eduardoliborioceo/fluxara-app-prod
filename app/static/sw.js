/* Fluxara Service Worker (safe by default)
   - Cacheia somente assets estáticos
   - Não cacheia páginas autenticadas
*/

const CACHE_VERSION = "fluxara-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const STATIC_ASSETS = [
  "/offline",
  "/static/css/style.css",
  "/static/css/legal.css",
  "/static/css/auth.css",
  "/static/css/powerbi.css",
  "/static/js/cookie-consent.js",
  "/static/js/pwa.js",
  "/static/images/logos/pwa-192.png",
  "/static/images/logos/pwa-512.png",
  "/static/images/logos/pwa-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("fluxara-") && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Cache-first para assets estáticos
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const res = await fetch(req);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(req, res.clone());
  return res;
}

// Network-first (com fallback offline) só para navegação pública
async function navigationNetworkFirst(req) {
  try {
    const res = await fetch(req);
    return res;
  } catch (e) {
    const offline = await caches.match("/offline");
    return offline || new Response("Offline", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Apenas mesmo origin
  if (url.origin !== self.location.origin) return;

  // Navegação (document)
  if (req.mode === "navigate") {
    // não cacheia HTML; tenta rede e cai no offline
    event.respondWith(navigationNetworkFirst(req));
    return;
  }

  // Assets estáticos: cache-first
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // SW e manifest: rede (com fallback cache se existir)
  if (url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch (e) {
          const cached = await caches.match(req);
          return cached || new Response("", { status: 503 });
        }
      })()
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "Fluxara", body: event.data.text() };
  }

  const title = payload.title || "Fluxara";
  const options = {
    body: payload.body || "",
    icon: "/static/images/logos/pwa-192.png",
    data: { url: payload.url || "/" },
    vibrate: [200, 100, 200],
    tag: payload.tag || ("fluxara-" + Date.now()),
    renotify: true,
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
