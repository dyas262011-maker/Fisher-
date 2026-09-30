/**
 * sw.js
 * Service worker cache-first sederhana. Tujuannya satu: begitu game ini
 * pernah dibuka sekali dengan internet (atau dari server lokal), semua
 * file di bawah ini tersimpan di cache perangkat, sehingga kunjungan
 * berikutnya — bahkan tanpa internet sama sekali — tetap bisa main penuh.
 *
 * Strategi: cache-first untuk file sendiri (App Shell), lalu diam-diam
 * memperbarui cache di background ("stale-while-revalidate") supaya
 * update game berikutnya tetap kepakai tanpa perlu uninstall.
 */
const CACHE_NAME = 'fishercraft-v1';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/style.css', './css/menu.css', './css/game.css', './css/shop.css',
  './js/fish.js', './js/locations.js', './js/achievements.js', './js/shop.js',
  './js/player.js', './js/save.js', './js/aquarium.js', './js/audio.js',
  './js/events.js', './js/fishing.js', './js/ui.js', './js/main.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png', './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(res => {
        if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        return res;
      }).catch(() => cached); // offline & belum ada di cache -> tidak ada yang bisa diberikan
      return cached || network;
    })
  );
});
