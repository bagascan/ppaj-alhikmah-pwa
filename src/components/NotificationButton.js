import React, { useState, useEffect } from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { BsBell, BsBellSlash, BsCheckCircle } from 'react-icons/bs';
import { toast } from 'react-toastify';
import { subscribeUser } from '../utils/push-notifications';

function NotificationButton({ userId }) {
  const [permission, setPermission] = useState(Notification.permission);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // Fungsi untuk mengupdate status saat berubah di pengaturan browser
    const updatePermissionStatus = () => {
      setPermission(Notification.permission);
    };

    // Cek perubahan izin secara berkala (atau bisa juga dengan event listener jika ada)
    const interval = setInterval(updatePermissionStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSubscribeClick = async () => {
    if (!userId) {
      toast.error("Gagal mengaktifkan notifikasi: Sesi pengguna tidak valid.");
      return;
    }

    setIsSubscribing(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        await subscribeUser(userId);
        toast.success('Notifikasi berhasil diaktifkan!');
      } else {
        toast.warn('Anda tidak mengizinkan notifikasi.');
      }
    } catch (error) {
      console.error('Gagal saat meminta izin notifikasi:', error);
      toast.error('Gagal mengaktifkan notifikasi.');
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager'in window)) {
    return <Alert variant="warning" className="mt-3">Browser Anda tidak mendukung notifikasi push.</Alert>;
  }

  if (permission === 'granted') {
    return (
      <Alert variant="success" className="mt-3 d-flex align-items-center">
        <BsCheckCircle className="me-2" /> Notifikasi sudah aktif.
      </Alert>
    );
  }

  if (permission === 'denied') {
    return (
      <Alert variant="danger" className="mt-3">
        <BsBellSlash className="me-2" /> Notifikasi diblokir. Harap aktifkan melalui pengaturan browser Anda.
      </Alert>
    );
  }

  return (
    <Button variant="info" onClick={handleSubscribeClick} disabled={isSubscribing} className="mt-3 w-100">
      {isSubscribing ? (
        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
      ) : (
        <><BsBell className="me-2" /> Aktifkan Notifikasi</>
      )}
    </Button>
  );
}

export default NotificationButton;