import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { toast } from 'react-toastify';
import DriverHome from './DriverHome'; // DriverHome sekarang akan mengelola logikanya sendiri
import PickupPage from './PickupPage'; // Pastikan ini diimpor
import DriverNav from './DriverNav'; // Pastikan ini diimpor
import DropoffPage from './DropoffPage'; // Impor halaman baru
import DriverProfile from './DriverProfile';
import ChatListPage from './ChatListPage';
import DriverChatPage from './ChatPage';
import ChangePasswordPage from './ChangePasswordPage';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api';
import { subscribeUser } from '../../utils/push-notifications';

function DriverDashboard() {
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const { auth, loading: authLoading } = useAuth();
  const driverId = auth?.user?.profileId;

  // Mengambil ID supir sekali saat komponen dimuat
  useEffect(() => {
    // Jangan lakukan apa-apa jika otentikasi masih loading atau tidak valid
    if (authLoading) {
      return;
    }

    // Pastikan role adalah supir dan ada profileId
    if (auth && auth.user.role === 'driver' && auth.user.profileId) {
      // Daftarkan supir untuk notifikasi push
      subscribeUser(auth.user.id); // PERBAIKAN: Gunakan user.id (ObjectId)
    } else {
      // Jika token ada tapi tidak valid untuk supir, tampilkan error.
      setLocationError("Gagal memverifikasi data supir dari sesi login.");
      toast.error("Sesi login tidak valid untuk supir.");
    }

    // Fungsi cleanup ini hanya akan berjalan jika DriverDashboard di-unmount (misal: logout)
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [auth, authLoading]);

  // Fungsi untuk menangani error geolokasi dengan lebih baik
  const handleLocationError = (error) => {
    let errorMsg = `ERROR(${error.code}): ${error.message}`;
    let userFriendlyError = 'Tidak bisa mendapatkan lokasi.';

    if (error.code === 1) {
      // PERMISSION_DENIED
      userFriendlyError = 'Akses lokasi ditolak. Mohon izinkan akses lokasi di pengaturan browser/ponsel Anda.';
    } else if (error.code === 3) {
      // TIMEOUT
      userFriendlyError = 'Waktu pencarian lokasi habis. Coba lagi di area dengan sinyal GPS yang lebih baik (misal: di luar ruangan).';
    }
    setLocationError(userFriendlyError);
    toast.error(userFriendlyError);
    console.error(errorMsg, error);
  };

  const handleToggleTracking = () => {
    if (!driverId) {
      toast.error("ID Supir tidak ditemukan, tidak bisa memulai pelacakan.");
      return;
    }
    if (!isTracking) {
      if (!navigator.geolocation) {
        setLocationError('Geolocation tidak didukung oleh browser Anda.');
        toast.error('Geolocation tidak didukung.');
        return;
      }

      toast.info('Mencari sinyal lokasi...');
      const highAccuracyOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };
      const lowAccuracyOptions = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 };

      const startWatching = (initialPosition) => {
        toast.success('Sinyal lokasi ditemukan! Pelacakan diaktifkan.');
        const { latitude, longitude } = initialPosition.coords;
        api.post('/drivers/location', { lat: latitude, lng: longitude });
        setLocationError(null);
        setIsTracking(true);

        // Setelah lokasi awal didapat, mulai watchPosition untuk update real-time
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                api.post('/drivers/location', { lat: latitude, lng: longitude });
                setLocationError(null); // Hapus error jika berhasil
            },
            (err) => {
              // Error saat watchPosition biasanya lebih minor (sinyal hilang sementara)
              // jadi kita hanya log di console dan tampilkan pesan singkat.
              console.error("Watch Position Error:", err.message);
              setLocationError("Sinyal lokasi terputus sementara.");
            },
            highAccuracyOptions // Selalu coba akurasi tinggi untuk pelacakan
        );
      };

      // Coba dapatkan lokasi awal dengan akurasi tinggi
      navigator.geolocation.getCurrentPosition(
          startWatching,
          (err) => {
            // Jika gagal (karena timeout atau alasan lain), coba lagi dengan akurasi rendah.
            if (err.code === 3) {
              toast.warn('Akurasi tinggi gagal, mencoba dengan akurasi standar...');
              navigator.geolocation.getCurrentPosition(
                startWatching,
                handleLocationError, // Jika ini juga gagal, tampilkan error yang lebih jelas.
                lowAccuracyOptions
              );
            } else {
              handleLocationError(err);
            }
          },
          highAccuracyOptions
      );

    } else {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      toast.info('Pelacakan lokasi dinonaktifkan.');
      setIsTracking(false);
    }
  };

  return (
    <Container>
      <Routes>
        <Route path="/" element={<DriverHome loading={authLoading} isTracking={isTracking} locationError={locationError} handleToggleTracking={handleToggleTracking} driverId={driverId} />} />
        <Route path="pickup" element={<PickupPage />} />
        <Route path="dropoff" element={<DropoffPage />} />
        {/* Untuk DriverNav, kita akan mengambil lokasi dari DriverHome jika diperlukan nanti,
            untuk sekarang kita biarkan sederhana */}
        <Route path="nav" element={<DriverNav />} />
        <Route path="profile/change-password" element={<ChangePasswordPage />} />
        <Route path="profile" element={<DriverProfile />} />
        <Route path="chat" element={<ChatListPage />} />
        <Route path="chat/:parentId" element={<DriverChatPage />} />
        <Route path="*" element={<Navigate to="/driver" replace />} />
      </Routes>
    </Container>
  );
}

export default DriverDashboard;