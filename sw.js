const scope = new URL(self.registration.scope);
const prefix = "tomato-garden:" + scope.pathname + ":";
const cacheName = prefix + "__GARDEN_RELEASE__";
const page = new URL("index.html", scope).href;
const localPreview = ["localhost", "127.0.0.1", "[::1]"].includes(scope.hostname);
const assets = [
  "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "friends.css", "friends-config.js", "friends.js", "garden-catalog.js", "garden-art.js"
].map(path => new URL(path, scope).href);

self.addEventListener("install", event => {
  if (localPreview) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  const requests = assets.map(url => new Request(url, {cache:"reload", redirect:"error"}));
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(requests)));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data === "apply-update") event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", event => {
  if (localPreview) return;
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin) return;
  const appNavigation = event.request.mode === "navigate" &&
    (url.pathname === scope.pathname || url.pathname === new URL(page).pathname);
  const asset = appNavigation ? page : url.href;
  if (!assets.includes(asset)) return;
  event.respondWith(caches.open(cacheName).then(async cache =>
    (await cache.match(asset)) ?? fetch(event.request)
  ));
});

self.addEventListener("push", event => {
  event.waitUntil(self.registration.showNotification("恭喜完成一次专注", {
    icon:new URL("icon-192.png", scope).href,
    tag:"focus-complete"
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    const existing = windows.find(client => {
      const url = new URL(client.url);
      return url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === new URL(page).pathname);
    });
    if (existing) await existing.focus();
    else await self.clients.openWindow(scope.href);
  })());
});
