const CACHE_NAME = "haak-intelligent-v21.2.1";
const ARTICLE_CACHE = "haak-article-offline-v1";
const APP_SHELL = [
  "./", "./index.html", "./pengurus.html", "./berita.html", "./detail-berita.html", "./kategori.html", "./tema.html", "./riwayat.html",
  "./kegiatan.html", "./refleksi.html", "./dokumentasi.html", "./video.html", "./podcast.html",
  "./direktori.html", "./direktori-detail.html", "./jejaring.html", 
  "./tentang.html", "./kontak.html", "./kebijakan-privasi.html", "./ketentuan-penggunaan.html", "./offline.html", "./css/style.css", "./js/data.js",
  "./js/app.js", "./js/smart-experience.js", "./js/v17-experience.js", "./js/v20-enhancement.js", "./js/v21-enhancement.js", "./css/v20-enhancement.css", "./css/v21-enhancement.css", "./manifest.webmanifest", "./img/icons/logo.png", "./img/icons/192x192.png",
  "./img/icons/512x512.png", "./img/news/31.08.2026-misa.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => ![CACHE_NAME, ARTICLE_CACHE].includes(key)).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      // Detail artikel memakai template yang sama dengan parameter ?id=...
      if (url.pathname.endsWith("/detail-berita.html")) {
        return caches.match("./detail-berita.html", { ignoreSearch: true }).then((template) => template || fetch(event.request));
      }
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") return caches.match("./offline.html");
        return caches.match("./index.html");
      });
    })
  );
});
