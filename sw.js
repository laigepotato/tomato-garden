const scope = new URL(self.registration.scope);
const prefix = "tomato-garden:" + scope.pathname + ":";
const cacheName = prefix + "__GARDEN_RELEASE__";
const page = new URL("index.html", scope).href;
const assets = [
  "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"
].map(path => new URL(path, scope).href);

self.addEventListener("install", event => {
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
