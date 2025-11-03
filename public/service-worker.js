/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// =================================================================
// == PERBAIKAN: PAKSA SERVICE WORKER UNTUK LANGSUNG AKTIF
// =================================================================
self.addEventListener('install', () => {
  self.skipWaiting();
});

// =================================================================
// == PUSH NOTIFICATION LOGIC
// =================================================================

// Event listener untuk push notification yang masuk
self.addEventListener('push', (event) => {
  const data = event.data.json();
  console.log('[Service Worker] Push Received:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png'
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Event listener untuk saat notifikasi diklik
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});