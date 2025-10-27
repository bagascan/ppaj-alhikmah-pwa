console.log('Service Worker Loaded');

self.addEventListener('push', e => {
  const data = e.data.json();
  console.log('Push Received...', data);
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: '/logo192.png', // Ikon kecil di status bar Android
    vibrate: [200, 100, 200] // Pola getar
  });
});