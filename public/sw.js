// IncaricApp service worker: offline app shell + push notifications.
const CACHE = "incaricapp-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Network first for pages, cache first for built assets; never touch Firebase or Google APIs.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

// Firebase Cloud Messaging delivers a standard Web Push whose body is JSON:
// { notification: { title, body }, data: { ... } }
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = { notification: { body: event.data && event.data.text() } }; }
  const n = payload.notification || {};
  const data = payload.data || {};
  event.waitUntil(
    self.registration.showNotification(n.title || "IncaricApp", {
      body: n.body || "",
      icon: "icons/icon-192.png",
      badge: "icons/badge-96.png",
      tag: data.taskId || undefined,
      data: { day: data.day || "" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const day = event.notification.data && event.notification.data.day;
  const target = new URL(day ? "./#" + day : "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(target); return c.focus(); } }
      return self.clients.openWindow(target);
    })
  );
});
