/*
 * Rele Lug'at — service worker.
 *
 * Bu SHABLON. Build paytida vite.config.ts (pwaServiceWorker plagini) undan
 * dist/sw.js va dist-web/sw.js ni yaratadi: VERSION ga barcha fayllarning
 * kontent xeshi, PRECACHE ga yig'ilgan fayllar ro'yxati yoziladi.
 *
 * Strategiya:
 *  - install: hamma statik fayl oldindan keshlanadi → ilova to'liq offline ishlaydi.
 *  - skipWaiting YO'Q: yangi versiya fonda yuklanadi va kutib turadi; ilova
 *    keyingi safar ochilganda (eski oynalar yopilgach) faollashadi — ishlab
 *    turgan sahifa ostidan fayllar almashib qolmaydi.
 *  - Barcha yo'llar SW scope'iga nisbatan hisoblanadi → istalgan base ostida ishlaydi.
 *  - APK (Capacitor) ichida bu fayl ro'yxatdan o'tkazilmaydi (src/pwa.ts).
 */
const VERSION = "fe90be8d80e9";
const CACHE = "rele-lugat-" + VERSION;
const PRECACHE = [
  "./assets/app.js",
  "./favicon.ico",
  "./icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./logo.svg",
  "./manifest.webmanifest"
];

const inScope = (path) => new URL(path, self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // cache: "reload" — fayl nomlarida xesh yo'q, shuning uchun HTTP kesh eski faylni bermasin.
      cache.addAll(PRECACHE.map((p) => new Request(inScope(p), { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("rele-lugat-") && k !== CACHE).map((k) => caches.delete(k)),
      );
      // Birinchi o'rnatishda joriy sahifa ham darhol offline'ga tayyor bo'lsin.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  // Sahifa ochilishi (navigatsiya) — har doim keshdagi ilova qobig'i.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(inScope("./index.html"))) ||
          (await cache.match(inScope("./"))) ||
          fetch(req)
        );
      })(),
    );
    return;
  }

  // Statik fayllar — avval kesh, bo'lmasa tarmoq.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
    })(),
  );
});
