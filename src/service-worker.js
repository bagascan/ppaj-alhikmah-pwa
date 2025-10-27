/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';

// Perintah ini memastikan bahwa service worker yang baru akan mengambil
// alih halaman sesegera mungkin setelah aktif.
clientsClaim();

// Precache semua aset yang dihasilkan oleh proses build.
// URL mereka akan dimasukkan ke dalam variabel self.__WB_MANIFEST oleh Workbox.
precacheAndRoute(self.__WB_MANIFEST);

// Aturan untuk navigasi halaman. Selalu layani index.html untuk semua
// permintaan navigasi (cocok untuk Single Page Application).
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') {
      return false;
    }
    if (url.pathname.startsWith('/_')) {
      return false;
    }
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }
    return true;
  },
  createHandlerBoundToURL('/index.html')
);

// Strategi caching untuk API: NetworkFirst.
// Mencoba mengambil dari jaringan terlebih dahulu, jika gagal, baru ambil dari cache.
// Cocok untuk data yang sering berubah seperti lokasi supir atau status siswa.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }), // Cache selama 5 menit
    ],
  })
);

// Event listener ini akan langsung mengaktifkan service worker baru
// tanpa melalui fase 'waiting'.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --- PUSH NOTIFICATION HANDLER ---
// Menambahkan event listener untuk menangani notifikasi push yang masuk.
self.addEventListener('push', e => {
  const data = e.data.json();
  console.log('Push Received...', data);
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || '/logo192.png', // Fallback icon
    badge: '/logo192.png', // Ikon kecil di status bar Android
    vibrate: [200, 100, 200] // Pola getar
  });
});