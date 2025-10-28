import api from '../api';
import { toast } from 'react-toastify';

/**
 * Mengonversi VAPID public key dari base64 string ke Uint8Array.
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Mendaftarkan service worker untuk push notification dan mengirim subscription ke backend.
 * @param {string} userId - ID unik untuk user (ObjectId dari database).
 */
export async function subscribeUser(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return;
  }

  const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('VAPID public key not found. Cannot subscribe for push notifications.');
    return;
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    // Kirim subscription ke backend
    await api.post('/subscribe', { userId, subscription });
    console.log('User is subscribed:', userId);
  } catch (error) {
    console.error('Failed to subscribe the user: ', error);
    toast.error('Gagal mengaktifkan notifikasi.');
  }
}